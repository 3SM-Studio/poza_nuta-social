export { cn } from "cn";

export function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function safeInternalPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const url = new URL(value, "https://internal.invalid");
    return url.origin === "https://internal.invalid" && url.pathname === "/kontakt" ? "/kontakt" : "/";
  } catch {
    return "/";
  }
}
