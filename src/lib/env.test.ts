import { afterEach, describe, expect, it } from "vitest";
import { getBootstrapOwnerEmail, getContactEmail, getSupabaseSecretKey, hasSupabaseAdminEnv } from "./env";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("server environment", () => {
  it("prefers the modern Supabase secret key", () => {
    process.env.SUPABASE_SECRET_KEY = "modern-secret";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy-service-role";
    expect(getSupabaseSecretKey()).toBe("modern-secret");
  });

  it("supports a narrow legacy service-role fallback", () => {
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy-service-role";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    expect(getSupabaseSecretKey()).toBe("legacy-service-role");
    expect(hasSupabaseAdminEnv()).toBe(true);
  });

  it("fails closed without a server-only key", () => {
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    expect(getSupabaseSecretKey()).toBe("");
    expect(hasSupabaseAdminEnv()).toBe(false);
  });

  it("does not render malformed contact placeholders", () => {
    process.env.CONTACT_EMAIL = "contact.example.invalid";
    expect(getContactEmail()).toBeNull();
    process.env.CONTACT_EMAIL = "kontakt@pozanuta.pl";
    expect(getContactEmail()).toBe("kontakt@pozanuta.pl");
  });

  it("normalizes only a valid bootstrap owner email", () => {
    process.env.BOOTSTRAP_OWNER_EMAIL = " Owner@PozaNuta.Test ";
    expect(getBootstrapOwnerEmail()).toBe("owner@pozanuta.test");
    process.env.BOOTSTRAP_OWNER_EMAIL = "not-an-email";
    expect(getBootstrapOwnerEmail()).toBeNull();
  });
});
