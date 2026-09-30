import { render } from "@react-email/components";
import { createElement } from "react";
import { Webhook } from "standardwebhooks";
import { AdminAuthEmail } from "./_templates/admin-auth-email.tsx";
import { allowedOrigins, authActionUrl, authEmailText, parseAuthEmail } from "./contract.ts";

export type AuthEmailConfig = {
  hookSecret?: string;
  resendApiKey?: string;
  sender?: string;
  allowedOrigins?: string;
  supabaseUrl?: string;
};

const defaultSender = "Poza Nutą <no-reply@auth.pozanuta.pl>";

export function createAuthEmailHandler(config: AuthEmailConfig, send: typeof fetch = fetch) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const secret = config.hookSecret;
    const apiKey = config.resendApiKey;
    const sender = config.sender || defaultSender;
    if (!secret?.startsWith("v1,whsec_") || !apiKey || !/^Poza Nutą <[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/.test(sender) || !config.supabaseUrl) {
      return Response.json({ error: "Email delivery unavailable" }, { status: 503 });
    }

    let origins: Set<string>;
    try { origins = allowedOrigins(config.allowedOrigins); } catch {
      return Response.json({ error: "Email delivery unavailable" }, { status: 503 });
    }

    const raw = await readBoundedBody(request, 64_000);
    if (raw === null) return Response.json({ error: "Invalid request" }, { status: 413 });
    let verified: unknown;
    try {
      const webhook = new Webhook(secret.slice("v1,whsec_".length));
      verified = webhook.verify(raw, Object.fromEntries(request.headers));
    } catch {
      return Response.json({ error: "Invalid hook signature" }, { status: 401 });
    }

    let payload: ReturnType<typeof parseAuthEmail>;
    let actionUrl: string;
    try {
      payload = parseAuthEmail(verified, origins);
      actionUrl = authActionUrl(payload, config.supabaseUrl);
    } catch {
      return Response.json({ error: "Unsupported auth email" }, { status: 422 });
    }

    const kind = payload.email_data.email_action_type;
    const correlationId = request.headers.get("webhook-id");
    if (!correlationId || !/^[a-zA-Z0-9_-]{1,128}$/.test(correlationId)) {
      return Response.json({ error: "Invalid hook identifier" }, { status: 400 });
    }
    try {
      const html = await render(createElement(AdminAuthEmail, { kind, actionUrl }));
      const response = await send("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `auth-email/${correlationId}`,
        },
        body: JSON.stringify({
          from: sender,
          to: [payload.user.email],
          subject: kind === "magiclink" ? "Logowanie do panelu Poza Nutą" : "Zaproszenie do panelu Poza Nutą",
          html,
          text: authEmailText(kind, actionUrl),
        }),
        signal: AbortSignal.timeout(3_500),
      });
      if (!response.ok) {
        console.warn("admin_auth_email", { type: kind, outcome: response.status >= 500 ? "provider_5xx" : "provider_4xx", correlationId });
        return Response.json({ error: "Email delivery unavailable" }, { status: 502 });
      }
      console.info("admin_auth_email", { type: kind, outcome: "accepted", correlationId });
      return Response.json({});
    } catch {
      console.warn("admin_auth_email", { type: kind, outcome: "provider_or_render_failure", correlationId });
      return Response.json({ error: "Email delivery unavailable" }, { status: 502 });
    }
  };
}

async function readBoundedBody(request: Request, maxBytes: number): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      parts.push(value);
    }
    const body = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      body.set(part, offset);
      offset += part.byteLength;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
