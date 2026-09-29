import { createAuthEmailHandler } from "./handler.ts";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

Deno.serve(createAuthEmailHandler({
  hookSecret: Deno.env.get("SEND_EMAIL_HOOK_SECRET"),
  resendApiKey: Deno.env.get("RESEND_API_KEY"),
  sender: Deno.env.get("AUTH_EMAIL_FROM"),
  allowedOrigins: Deno.env.get("AUTH_EMAIL_ALLOWED_ORIGINS"),
  supabaseUrl: Deno.env.get("SUPABASE_URL"),
}));
