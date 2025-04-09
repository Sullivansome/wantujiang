// middleware.ts
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/admin/login"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res: response });

  // Skip auth checks for public paths
  if (PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return response;
  }

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Redirect to login if no session
  if (!session) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", session.user.id)
    .single();

  // Block non-admins
  if (!profile?.is_admin) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/admin/unauthorized", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
