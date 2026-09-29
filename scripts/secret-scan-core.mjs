const patterns = [
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
  [/\b(?:sb_secret_|sk_live_|sk_test_)[A-Za-z0-9_-]{16,}\b/, "secret API key"],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{20,}\b/, "JWT-like credential"],
  [/^SUPABASE_SERVICE_ROLE_KEY=[ \t]*[A-Za-z0-9._-]{8,}[ \t]*$/, "populated service-role key"],
  [/^SUPABASE_SECRET_KEY=[ \t]*[A-Za-z0-9._-]{8,}[ \t]*$/, "populated Supabase secret key"],
  [/^ANALYTICS_SIGNING_SECRET=[ \t]*[A-Za-z0-9._-]{8,}[ \t]*$/, "populated analytics signing secret"],
];

export function scanFile(file, bytes) {
  if (bytes.some((byte) => byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) return [];
  let content;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return [];
  }
  const lines = content.split(/\r?\n/);
  const findings = [];
  for (let index = 0; index < lines.length; index++) {
    for (const [pattern, type] of patterns) {
      if (pattern.test(lines[index])) findings.push({ file, line: index + 1, type });
    }
  }
  return findings;
}
