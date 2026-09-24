import { describe, expect, it } from "vitest";
import { EVENT_NAMES } from "../analytics-taxonomy";
import { CLIENT_EVENT_NAMES, isClientEventName, isClientEventPayload } from "./contract";
import { track } from "./client";

describe("canonical client analytics contract", () => {
  it("covers every current client event and rejects server-only/unsupported names", () => {
    expect(CLIENT_EVENT_NAMES).toEqual(["page_view", "contact_view", "contact_click", "hub_resumed"]);
    for (const name of CLIENT_EVENT_NAMES) {
      expect(EVENT_NAMES).toContain(name);
      expect(isClientEventName(name)).toBe(true);
    }
    for (const name of ["tracking_entry", "outbound_click", "made_up_event"]) expect(isClientEventName(name)).toBe(false);
  });

  it("validates payloads by event and rejects arbitrary properties", () => {
    expect(isClientEventPayload("page_view", undefined)).toBe(true);
    expect(isClientEventPayload("contact_view", {})).toBe(true);
    expect(isClientEventPayload("contact_click", { contactType: "email" })).toBe(true);
    expect(isClientEventPayload("hub_resumed", { priorDestination: "instagram", resumeSignal: "pageshow", elapsedBucket: "2-10s", bfcache: true })).toBe(true);
    expect(isClientEventPayload("page_view", { arbitrary: true })).toBe(false);
    expect(isClientEventPayload("contact_click", { contactType: "phone" })).toBe(false);
    expect(isClientEventPayload("contact_click", { contactType: "email", project_key: "other" })).toBe(false);
    expect(isClientEventPayload("hub_resumed", { priorDestination: "instagram" })).toBe(false);
  });

  it("keeps compile-time event payloads narrow", () => {
    if (false) {
      // @ts-expect-error Unsupported event name.
      track("outbound_click");
      // @ts-expect-error Contact click requires its real payload.
      track("contact_click");
      // @ts-expect-error Project context is server-owned.
      track("contact_click", { contactType: "email", project_key: "other" });
      // @ts-expect-error A page view has no arbitrary properties.
      track("page_view", { userId: "person" });
    }
    expect(true).toBe(true);
  });
});
