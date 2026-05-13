import { createRequestSupabaseClient } from "@/lib/supabase";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/unauthorized"];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createRequestSupabaseClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some((path) =>
    pathname.startsWith(path),
  );

  if (isPublicAdminPath) {
    return response;
  }

  if (!user) {
    return redirectWithCookies(request, response, "/admin/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    await supabase.auth.signOut();
    return redirectWithCookies(request, response, "/admin/unauthorized");
  }

  return response;
}

function redirectWithCookies(
  request: NextRequest,
  sourceResponse: NextResponse,
  pathname: string,
) {
  const redirectResponse = NextResponse.redirect(new URL(pathname, request.url));
  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export const config = {
  matcher: ["/admin/:path*"],
};
