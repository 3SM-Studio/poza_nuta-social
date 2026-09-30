import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Poza Nutą — wieczory karaoke w Trójmieście";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public", "brand", "poza-nuta-logo.svg"));
  const logoUrl = `data:image/svg+xml;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "54px 64px 48px", borderTop: "16px solid #ff4fa3", background: "#f7f6f3", color: "#101010" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 700, letterSpacing: 3 }}>
        <span>POZA NUTĄ / WIECZORY KARAOKE</span>
        <span>TRÓJMIASTO</span>
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 70 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 266, height: 266, background: "#ff4fa3" }}>
          {/* ImageResponse renders the supplied brand SVG without reconstructing its geometry. */}
          <img src={logoUrl} width={226} height={226} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 73, fontWeight: 700, lineHeight: 0.99, letterSpacing: -4 }}><span>Wieczory karaoke</span><span>w Trójmieście.</span></div>
          <div style={{ marginTop: 31, fontSize: 30 }}>Dla uczestników i lokali.</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 20, borderTop: "2px solid #101010", fontSize: 19, fontWeight: 700, letterSpacing: 2 }}>
        <span>POZANUTA.PL</span>
        <span>UDZIAŁ · WSPÓŁPRACA · KONTAKT</span>
      </div>
    </div>,
    size,
  );
}
