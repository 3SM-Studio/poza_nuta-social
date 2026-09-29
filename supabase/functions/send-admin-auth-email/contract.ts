export type AuthEmailKind = "magiclink" | "invite";

type AuthEmailPayload = {
  user: { email: string };
  email_data: {
    email_action_type: AuthEmailKind;
    token_hash: string;
    redirect_to: string;
  };
};

const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const tokenHashPattern = /^[a-zA-Z0-9_-]{32,256}$/;

export function allowedOrigins(value: string | undefined): Set<string> {
  const entries = (value || "https://pozanuta.pl").split(",").map((entry) => entry.trim());
  if (entries.some((entry) => !entry)) throw new Error("Invalid allowed origins configuration");
  return new Set(entries.map((entry) => {
    const url = new URL(entry);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) || url.hostname.includes("*") ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      entry !== url.origin) throw new Error("Invalid allowed origin");
    return url.origin;
  }));
}

export function parseAuthEmail(value: unknown, origins: Set<string>): AuthEmailPayload {
  if (!value || typeof value !== "object") throw new Error("Invalid hook payload");
  const payload = value as Record<string, unknown>;
  const user = payload.user;
  const data = payload.email_data;
  if (!user || typeof user !== "object" || !data || typeof data !== "object") throw new Error("Invalid hook payload");
  const email = (user as Record<string, unknown>).email;
  const fields = data as Record<string, unknown>;
  const kind = fields.email_action_type;
  const hash = fields.token_hash;
  const redirect = fields.redirect_to;
  if (typeof email !== "string" || !emailPattern.test(email) || email.length > 254 ||
    (kind !== "magiclink" && kind !== "invite") ||
    typeof hash !== "string" || !tokenHashPattern.test(hash) ||
    typeof redirect !== "string") throw new Error("Unsupported or invalid auth email");

  let url: URL;
  try { url = new URL(redirect); } catch { throw new Error("Invalid auth redirect"); }
  const expectedPath = kind === "magiclink" ? "/auth/callback" : "/auth/confirm";
  if (!origins.has(url.origin) || url.pathname !== expectedPath || url.search || url.hash ||
    url.username || url.password) throw new Error("Unapproved auth redirect");

  return { user: { email }, email_data: { email_action_type: kind, token_hash: hash, redirect_to: url.toString() } };
}

export function authActionUrl(payload: AuthEmailPayload, supabaseUrl: string): string {
  const { email_action_type: kind, token_hash: hash, redirect_to: redirect } = payload.email_data;
  if (kind === "invite") {
    const url = new URL(redirect);
    url.searchParams.set("token_hash", hash);
    url.searchParams.set("type", "invite");
    return url.toString();
  }

  const base = new URL(supabaseUrl);
  const local = base.hostname === "localhost" || base.hostname === "127.0.0.1";
  if ((base.protocol !== "https:" && !(local && base.protocol === "http:")) ||
    base.username || base.password || base.pathname !== "/" || base.search || base.hash) {
    throw new Error("Invalid Supabase URL configuration");
  }
  const url = new URL("/auth/v1/verify", base);
  url.searchParams.set("token", hash);
  url.searchParams.set("type", "magiclink");
  url.searchParams.set("redirect_to", redirect);
  return url.toString();
}

export function authEmailText(kind: AuthEmailKind, actionUrl: string): string {
  const heading = kind === "magiclink" ? "Logowanie do panelu Poza Nutą" : "Zaproszenie do panelu Poza Nutą";
  const action = kind === "magiclink" ? "Zaloguj się do panelu Poza Nutą" : "Przyjmij zaproszenie do panelu Poza Nutą";
  return `${heading}\n\n${kind === "magiclink" ? "Otrzymaliśmy prośbę o zalogowanie do panelu." : "Otrzymujesz zaproszenie do wewnętrznego panelu."}\n\n${action}:\n${actionUrl}\n\nLink jest jednorazowy i ma ograniczony czas ważności.${kind === "magiclink" ? " Otwórz go w tej samej przeglądarce, w której rozpoczęto logowanie." : ""}\n\nJeśli nie prosisz o tę wiadomość, możesz ją zignorować.\n\nPoza Nutą`;
}
