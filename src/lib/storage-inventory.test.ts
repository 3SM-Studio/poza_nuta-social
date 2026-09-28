import { describe, expect, it } from "vitest";
import { CONSENT_PREFERENCE_COOKIE, localPreferenceCookie } from "./consent-preference";
import { storageInventory } from "./storage-inventory";

describe("public browser storage inventory", () => {
  it("discloses the denial/pending cookie and transient cross-tab signal", () => {
    const publicItems = storageInventory.filter((item) => item.audience === "public");
    const preference = publicItems.find((item) => item.name === CONSENT_PREFERENCE_COOKIE);
    expect(preference?.category).toBe("Niezbędne");
    expect(preference?.duration).toContain("180 dni");
    expect(localPreferenceCookie("deny", true)).toContain("Max-Age=15552000");
    expect(localPreferenceCookie("deny", true)).toContain(`${CONSENT_PREFERENCE_COOKIE}=`);

    const signal = publicItems.find((item) => item.name === "pn_consent_signal (localStorage)");
    expect(signal?.duration).toContain("usuwany od razu");
  });
});
