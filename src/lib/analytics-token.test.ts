import { describe, expect, it } from "vitest";
import { signAnalyticsToken, verifyAnalyticsToken } from "./analytics-token";

describe("analytics token integrity", () => {
  it("accepts a valid purpose-bound token and rejects tampering", async () => {
    const token = await signAnalyticsToken("session", { id: "abc", exp: Math.floor(Date.now() / 1000) + 60 });
    expect(await verifyAnalyticsToken<{ id: string; exp: number }>("session", token)).toMatchObject({ id: "abc" });
    expect(await verifyAnalyticsToken("visitor", token)).toBeNull();
    expect(await verifyAnalyticsToken("session", `${token}x`)).toBeNull();
  });
  it("rejects expired tokens", async () => {
    const token = await signAnalyticsToken("session", { id: "abc", exp: Math.floor(Date.now() / 1000) - 1 });
    expect(await verifyAnalyticsToken("session", token)).toBeNull();
  });
});
