import { describe, expect, it } from "vitest";
import { deviceCategory, validVisitId } from "./attribution";

describe("attribution", () => {
  it("reduces user agent to broad categories", () => {
    expect(deviceCategory("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18 Mobile Safari/604.1")).toMatchObject({deviceType:"mobile",osFamily:"ios",browserFamily:"safari"});
    expect(deviceCategory("Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 Chrome/126.0 Safari/537.36")).toMatchObject({deviceType:"tablet",osFamily:"android",browserFamily:"chrome"});
    expect(deviceCategory("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36")).toMatchObject({deviceType:"mobile",osFamily:"android",browserFamily:"chrome"});
  });
  it("accepts only UUID visit identifiers", () => {
    expect(validVisitId("e531c93f-1db5-4d11-8821-5ac3a99146fe")).toBe("e531c93f-1db5-4d11-8821-5ac3a99146fe");
    expect(validVisitId("not-a-uuid")).toBeNull();
  });
});
