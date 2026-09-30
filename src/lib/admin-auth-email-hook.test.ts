import { afterEach, describe, expect, it, vi } from "vitest";
import { Webhook } from "standardwebhooks";
import { allowedOrigins, authActionUrl, authEmailText, parseAuthEmail } from "../../supabase/functions/send-admin-auth-email/contract";
import { createAuthEmailHandler } from "../../supabase/functions/send-admin-auth-email/handler";

const key = Buffer.from("local-hook-signature-test-secret-32-bytes").toString("base64");
const secret = `v1,whsec_${key}`;
const config = {
  hookSecret: secret,
  resendApiKey: "re_test_server_only",
  allowedOrigins: "https://pozanuta.pl,http://localhost:3000",
  supabaseUrl: "https://project.supabase.co",
};
const hash = "a".repeat(64);

function payload(kind: string = "magiclink", redirect = "https://pozanuta.pl/auth/callback") {
  return {
    user: { email: "owner@pozanuta.pl" },
    email_data: { email_action_type: kind, token_hash: hash, redirect_to: redirect },
  };
}

function signedRequest(body: unknown, options: { signature?: string; id?: string } = {}) {
  const raw = JSON.stringify(body);
  const id = options.id || "msg_123";
  const now = new Date();
  return new Request("http://localhost/functions/v1/send-admin-auth-email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": id,
      "webhook-timestamp": String(Math.floor(now.getTime() / 1000)),
      "webhook-signature": options.signature || new Webhook(key).sign(id, now, raw),
    },
    body: raw,
  });
}

afterEach(() => vi.restoreAllMocks());

describe("Admin Auth Send Email Hook", () => {
  it("sends signed magic links through the Resend HTTP API with HTML and plain text", async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: "email_1" }));
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await createAuthEmailHandler(config, send)(signedRequest(payload()));
    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    const [url, init] = send.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer re_test_server_only",
      "Idempotency-Key": "auth-email/msg_123",
    });
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      from: "Poza Nutą <no-reply@auth.pozanuta.pl>",
      to: ["owner@pozanuta.pl"],
      subject: "Logowanie do panelu Poza Nutą",
    });
    expect(body.html).toContain("Zaloguj się do panelu Poza Nutą");
    expect(body.html).toContain('lang="pl"');
    expect(body.html).toContain("<h1");
    expect(body.html).toContain("Jeśli przycisk nie działa");
    expect(body.html).toContain("POZA");
    expect(body.html).toContain("#ff4fa3");
    expect(body.html).toContain("auth/v1/verify?token=");
    expect(body.text).toContain("https://project.supabase.co/auth/v1/verify?token=");
    expect(body.text).toContain("redirect_to=https%3A%2F%2Fpozanuta.pl%2Fauth%2Fcallback");
    expect(body.text).toContain("Jeśli nie prosisz o tę wiadomość");
    expect(body.html).not.toContain("<img");
    expect(body.html).not.toContain("utm_");
    const responseBody = JSON.stringify(await response.json());
    expect(responseBody).not.toContain(hash);
    expect(responseBody).not.toContain(config.resendApiKey);
  });

  it("sends invite links to the existing server confirmation route", async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: "email_2" }));
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await createAuthEmailHandler(config, send)(signedRequest(payload("invite", "https://pozanuta.pl/auth/confirm")));
    expect(response.status).toBe(200);
    const body = JSON.parse(String(send.mock.calls[0][1]?.body));
    expect(body.subject).toBe("Zaproszenie do panelu Poza Nutą");
    expect(body.text).toContain("https://pozanuta.pl/auth/confirm?token_hash=");
    expect(body.text).toContain("type=invite");
    expect(body.text).not.toContain("project.supabase.co/auth/v1/verify");
  });

  it("accepts an explicitly configured local origin and keeps PKCE callback", () => {
    const parsed = parseAuthEmail(payload("magiclink", "http://localhost:3000/auth/callback"), allowedOrigins(config.allowedOrigins));
    expect(new URL(authActionUrl(parsed, "http://127.0.0.1:54321")).searchParams.get("redirect_to"))
      .toBe("http://localhost:3000/auth/callback");
  });

  it.each([
    ["unsupported message", payload("recovery")],
    ["invalid email", { ...payload(), user: { email: "not-email" } }],
    ["missing token", { ...payload(), email_data: { ...payload().email_data, token_hash: "" } }],
    ["external redirect", payload("magiclink", "https://evil.example/auth/callback")],
    ["wrong path", payload("magiclink", "https://pozanuta.pl/admin")],
    ["query redirect", payload("magiclink", "https://pozanuta.pl/auth/callback?next=https://evil.example")],
    ["invite to callback", payload("invite", "https://pozanuta.pl/auth/callback")],
  ])("rejects %s without calling Resend", async (_name, value) => {
    const send = vi.fn<typeof fetch>();
    const response = await createAuthEmailHandler(config, send)(signedRequest(value));
    expect(response.status).toBe(422);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature and missing configuration", async () => {
    const send = vi.fn<typeof fetch>();
    expect((await createAuthEmailHandler(config, send)(signedRequest(payload(), { signature: "v1,bad" }))).status).toBe(401);
    expect((await createAuthEmailHandler({ ...config, hookSecret: undefined }, send)(signedRequest(payload()))).status).toBe(503);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects a replayed webhook timestamp", async () => {
    const raw = JSON.stringify(payload());
    const old = new Date(Date.now() - 10 * 60_000);
    const request = new Request("http://localhost/functions/v1/send-admin-auth-email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": "old_123",
        "webhook-timestamp": String(Math.floor(old.getTime() / 1000)),
        "webhook-signature": new Webhook(key).sign("old_123", old, raw),
      },
      body: raw,
    });
    expect((await createAuthEmailHandler(config, vi.fn<typeof fetch>())(request)).status).toBe(401);
  });

  it.each([400, 401, 422, 429, 500, 503])("fails closed on Resend HTTP %s", async (status) => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response("provider detail with secret", { status }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await createAuthEmailHandler(config, send)(signedRequest(payload()));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("provider detail");
    expect(warn.mock.calls[0][1]).toMatchObject({ type: "magiclink", outcome: status >= 500 ? "provider_5xx" : "provider_4xx" });
    expect(JSON.stringify(warn.mock.calls)).not.toContain("owner@pozanuta.pl");
    expect(JSON.stringify(warn.mock.calls)).not.toContain(hash);
  });

  it("fails closed on provider timeout without exposing a secret or token", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const send = vi.fn<typeof fetch>().mockRejectedValue(new Error("provider error: re_test_server_only"));
    const response = await createAuthEmailHandler(config, send)(signedRequest(payload()));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("re_test_server_only");
    expect(JSON.stringify(warn.mock.calls)).not.toContain("re_test_server_only");
  });

  it("rejects malformed payload and never sends a message", async () => {
    const send = vi.fn<typeof fetch>();
    expect((await createAuthEmailHandler(config, send)(signedRequest({ user: {} }))).status).toBe(422);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects unsupported methods and oversized bodies before delivery", async () => {
    const send = vi.fn<typeof fetch>();
    const handler = createAuthEmailHandler(config, send);
    expect((await handler(new Request("http://localhost/functions/v1/send-admin-auth-email"))).status).toBe(405);
    expect((await handler(signedRequest({ ...payload(), extra: "x".repeat(65_000) }))).status).toBe(413);
    expect(send).not.toHaveBeenCalled();
  });

  it("validates the closed origin list and plaintext wording", () => {
    expect(() => allowedOrigins("https://pozanuta.pl/auth/callback")).toThrow();
    expect(() => allowedOrigins("http://pozanuta.pl")).toThrow();
    expect(() => allowedOrigins("https://*.vercel.app")).toThrow();
    expect(authEmailText("invite", "https://pozanuta.pl/auth/confirm")).toContain("Przyjmij zaproszenie");
  });
});
