import { NextResponse, type NextRequest } from "next/server";
import { reconcileAdminMembership } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const supabase = await createSupabaseServerClient();
  const destination = new URL("/admin/login", request.url);

  if (tokenHash && type === "invite" && supabase) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" });
    const access = data.user ? await reconcileAdminMembership(data.user) : null;
    if (!error && access) {
      destination.pathname = "/admin";
      destination.search = "";
    } else {
      destination.searchParams.set("error", error ? "invite-invalid" : "access-denied");
    }
  } else {
    destination.searchParams.set("error", "invite-invalid");
  }

  const response = NextResponse.redirect(destination, 302);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
