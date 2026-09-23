import { NextResponse, type NextRequest } from "next/server";
import { reconcileAdminMembership } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const supabase = await createSupabaseServerClient();
  const redirectTo = new URL("/admin", request.url);
  if (!code || !supabase) redirectTo.pathname = "/admin/login";
  if (!code || !supabase) redirectTo.searchParams.set("error", "callback-failed");

  if (code && supabase) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const access = !error && data.user ? await reconcileAdminMembership(data.user) : null;
    if (error || !access) {
      redirectTo.pathname = "/admin/login";
      redirectTo.searchParams.set("error", error ? "callback-failed" : "access-denied");
    }
  }

  const response = NextResponse.redirect(redirectTo, 302);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
