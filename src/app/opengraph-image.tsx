import { ImageResponse } from "next/og";

export const alt = "Poza Nutą — Trójmiasto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0d0b0d", color: "#fff8fc", padding: 72 }}>
      <div style={{ color: "#ff4fa3", fontSize: 26, fontWeight: 800, letterSpacing: 5 }}>TRÓJMIASTO</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 132, lineHeight: 0.85, letterSpacing: -9, fontWeight: 900 }}>
          <span>POZA</span>
          <span>NUTĄ</span>
        </div>
        <div style={{ marginTop: 36, fontSize: 34, fontWeight: 700 }}>Karaoke · wydarzenia · kontakt</div>
      </div>
    </div>,
    size,
  );
}
