import { execSync, spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const status = execSync("npx supabase status -o env", { encoding: "utf8" });
const local = Object.fromEntries([...status.matchAll(/^([A-Z_]+)="([^"]*)"$/gm)].map((match) => [match[1], match[2]]));
const secretKey = local.SECRET_KEY || local.SERVICE_ROLE_KEY;
if (!local.API_URL || !secretKey || !local.PUBLISHABLE_KEY || !local.MAILPIT_URL) throw new Error("Local Supabase is not ready for E2E");

const email = "admin@pozanuta.test";
const admin = createClient(local.API_URL, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: listed, error: listError } = await admin.auth.admin.listUsers();
if (listError) throw new Error(listError.message);
let user = listed.users.find((candidate) => candidate.email?.toLowerCase() === email);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw new Error(error?.message || "Unable to create local owner");
  user = data.user;
}
const { data: profile, error: profileReadError } = await admin.from("admin_profiles").select("user_id").eq("user_id", user.id).maybeSingle();
if (profileReadError) throw new Error(profileReadError.message);
if (profile) {
  const { error } = await admin.from("admin_profiles").update({ email, role: "owner", status: "active", deactivated_at: null }).eq("user_id", user.id);
  if (error) throw new Error(error.message);
} else {
  const { data: owners, error: ownersError } = await admin.from("admin_profiles").select("user_id").eq("role", "owner").eq("status", "active");
  if (ownersError) throw new Error(ownersError.message);
  if (owners.length) throw new Error("Local E2E requires a reset database or the existing bootstrap owner");
  const { error } = await admin.rpc("admin_bootstrap_owner_v1", { p_user_id: user.id, p_email: email });
  if (error) throw new Error(error.message);
}

const env = {
  ...process.env,
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: secretKey,
  ANALYTICS_SIGNING_SECRET: "local-e2e-analytics-signing-key-32-characters",
  VERCEL_ENV: "production",
  BOOTSTRAP_OWNER_EMAIL: email,
  CONTACT_EMAIL: "kontakt@pozanuta.test",
  LOCAL_ADMIN_E2E_EMAIL: email,
  LOCAL_MAILPIT_URL: local.MAILPIT_URL,
};
const command = `npm run test:e2e -- ${process.argv.slice(2).map((part) => `"${part.replaceAll('"', '\\"')}"`).join(" ")}`;
const result = spawnSync(command, { cwd: process.cwd(), env, shell: true, stdio: "inherit" });
process.exit(result.status ?? 1);
