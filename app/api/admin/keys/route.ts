import { generateApiKey } from "@/lib/api-keys";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const apiKeyStatusSchema = z.enum(["active", "revoked"]);

const createKeySchema = z
  .object({
    order_id: z.string().trim().min(1),
    credits: z.number().int().nonnegative(),
  })
  .strict();

const updateKeySchema = z
  .object({
    id: z.string().trim().min(1),
    updates: z
      .object({
        credits: z.number().int().nonnegative().optional(),
        status: apiKeyStatusSchema.optional(),
      })
      .strict()
      .refine((updates) => Object.keys(updates).length > 0, {
        message: "No allowed update fields provided",
      }),
  })
  .strict();

interface ApiKeyRecord {
  id: string;
  order_id: string;
  key: string;
  credits: number;
  status: "active" | "revoked";
  created_at: string;
  last_used: string | null;
  total_used: number | null;
}

function toApiKeyDto(record: ApiKeyRecord) {
  return {
    id: record.id,
    order_id: record.order_id,
    key: record.key,
    credits: record.credits,
    status: record.status,
    created_at: record.created_at,
    last_used: record.last_used,
    total_used: record.total_used ?? 0,
  };
}

async function authorizeAdmin() {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (!authHeader) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Authorization header missing" },
        { status: 401 },
      ),
    };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Invalid session" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      ),
    };
  }

  return { user, error: null };
}

export async function GET() {
  try {
    const { error } = await authorizeAdmin();
    if (error) return error;

    const { data, error: fetchError } = await supabaseAdmin
      .from("api_keys")
      .select(
        "id, order_id, key, credits, status, created_at, last_used, total_used",
      )
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;

    return NextResponse.json((data ?? []).map(toApiKeyDto));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { error } = await authorizeAdmin();
    if (error) return error;

    const parsed = createKeySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const key = generateApiKey();

    const { data, error: insertError } = await supabaseAdmin
      .from("api_keys")
      .insert([
        {
          order_id: parsed.data.order_id,
          credits: parsed.data.credits,
          key,
        },
      ])
      .select(
        "id, order_id, key, credits, status, created_at, last_used, total_used",
      )
      .single<ApiKeyRecord>();

    if (insertError) throw insertError;

    return NextResponse.json(toApiKeyDto(data), { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { error } = await authorizeAdmin();
    if (error) return error;

    const parsed = updateKeySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { id, updates } = parsed.data;

    const { data, error: updateError } = await supabaseAdmin
      .from("api_keys")
      .update(updates)
      .eq("id", id)
      .select(
        "id, order_id, key, credits, status, created_at, last_used, total_used",
      )
      .single<ApiKeyRecord>();

    if (updateError) throw updateError;

    return NextResponse.json(toApiKeyDto(data));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
