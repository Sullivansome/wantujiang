import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { generateApiKey } from "@/lib/api-keys";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Helper: get current user and verify is admin
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

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
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
      .select("*")
      .order("created_at", { ascending: false });
    if (fetchError) throw fetchError;

    return NextResponse.json(data || []);
  } catch (e) {
    console.error(e);
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

    const body = await req.json();
    const { order_id, credits } = body;

    if (!order_id || !credits ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const key = generateApiKey()

    const { data, error: insertError } = await supabaseAdmin
      .from("api_keys")
      .insert([{ order_id: order_id.toString(), credits, key }])
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error(e);
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

    const body = await req.json();
    const { id, updates } = body;
    if (!id || !updates) {
      return NextResponse.json(
        { error: "Missing id or updates" },
        { status: 400 },
      );
    }

    const { data, error: updateError } = await supabaseAdmin
      .from("api_keys")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
