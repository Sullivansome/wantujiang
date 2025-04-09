import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Helper to generate API key
function generateApiKey() {
  return `sk-${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { order_id, credits, max_requests_per_minute, allowed_ips } =
      await request.json();

    const { data, error } = await supabase
      .from("api_keys")
      .insert([
        {
          order_id,
          key: generateApiKey(),
          credits,
          max_requests_per_minute,
          allowed_ips,
          status: "active",
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, updates } = await request.json();

    const { data, error } = await supabase
      .from("api_keys")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 },
    );
  }
}
