const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function deviceCategory(userAgent?: string | null) {
  const ua = (userAgent || "").toLowerCase();
  const deviceType = /ipad|tablet/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua)) ? "tablet" : /iphone|android|mobile/.test(ua) ? "mobile" : "desktop";
  const osFamily = /iphone|ipad|ios/.test(ua) ? "ios" : /android/.test(ua) ? "android" : /windows/.test(ua) ? "windows" : /mac os|macintosh/.test(ua) ? "macos" : /linux/.test(ua) ? "linux" : "other";
  const browserFamily = /edg\//.test(ua) ? "edge" : /firefox\//.test(ua) ? "firefox" : /chrome\//.test(ua) && !/edg\//.test(ua) ? "chrome" : /safari\//.test(ua) && !/chrome\//.test(ua) ? "safari" : "other";
  return { deviceType, osFamily, browserFamily };
}

export function validVisitId(value?: string | null) {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}
