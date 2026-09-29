import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from "@react-email/components";

export function AdminAuthEmail({ kind, actionUrl }: { kind: "magiclink" | "invite"; actionUrl: string }) {
  const login = kind === "magiclink";
  const title = login ? "Logowanie do panelu" : "Zaproszenie do panelu";
  const action = login ? "Zaloguj się do panelu Poza Nutą" : "Przyjmij zaproszenie do panelu Poza Nutą";
  return (
    <Html lang="pl">
      <Head />
      <Preview>{title} Poza Nutą</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={brand}>POZA <span style={{ color: "#ff4fa3" }}>NUTĄ</span></Text>
          <Section style={rule} />
          <Heading as="h1" style={heading}>{title}</Heading>
          <Text style={paragraph}>
            {login ? "Otrzymaliśmy prośbę o zalogowanie do panelu Poza Nutą." : "Otrzymujesz zaproszenie do wewnętrznego panelu Poza Nutą."}
          </Text>
          <Section style={actionSection}>
            <Link href={actionUrl} style={button}>{action}</Link>
          </Section>
          <Text style={paragraph}>Link jest jednorazowy i ma ograniczony czas ważności.{login ? " Otwórz go w tej samej przeglądarce, w której rozpoczęto logowanie." : ""}</Text>
          <Text style={small}>Jeśli przycisk nie działa, skopiuj ten adres do przeglądarki:</Text>
          <Text style={fallback}><Link href={actionUrl} style={rawLink}>{actionUrl}</Link></Text>
          <Section style={rule} />
          <Text style={small}>Jeśli nie prosisz o tę wiadomość, możesz ją zignorować.</Text>
          <Text style={footer}>Poza Nutą · Wiadomość dotycząca dostępu do panelu</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#f5f5f3", color: "#111111", fontFamily: "Arial, Helvetica, sans-serif", margin: 0 };
const container = { backgroundColor: "#ffffff", maxWidth: "560px", margin: "32px auto", padding: "32px 28px" };
const brand = { color: "#111111", fontSize: "19px", fontWeight: 800, letterSpacing: "0.08em", margin: "0 0 18px" };
const rule = { borderTop: "1px solid #d9d9d7", height: "1px", margin: "0 0 28px" };
const heading = { color: "#111111", fontSize: "28px", lineHeight: "1.2", margin: "0 0 18px" };
const paragraph = { color: "#262626", fontSize: "16px", lineHeight: "1.55", margin: "0 0 20px" };
const actionSection = { margin: "28px 0" };
const button = { backgroundColor: "#111111", color: "#ffffff", display: "inline-block", fontSize: "15px", fontWeight: 700, lineHeight: "1.4", padding: "15px 19px", textDecoration: "none" };
const small = { color: "#4b4b4b", fontSize: "13px", lineHeight: "1.5", margin: "18px 0 8px" };
const fallback = { fontSize: "12px", lineHeight: "1.5", overflowWrap: "anywhere" as const, margin: "0 0 28px" };
const rawLink = { color: "#111111", textDecoration: "underline" };
const footer = { color: "#686868", fontSize: "12px", lineHeight: "1.5", margin: "22px 0 0" };
