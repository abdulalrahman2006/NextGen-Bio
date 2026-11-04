import { ImageResponse } from "next/og";

export const alt = "NextGen Bio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The default picture shown when a page is shared and has no image of its own.
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "#1D2B36", color: "#F8FAFC", padding: 80 }}>
        <div style={{ display: "flex", fontSize: 140, fontWeight: 900, lineHeight: 0.92, letterSpacing: -6 }}>BIOTECH RESEARCH.</div>
        <div style={{ display: "flex", fontSize: 140, fontWeight: 900, lineHeight: 0.92, letterSpacing: -6, color: "#D9A15F" }}>DECODED.</div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 34, color: "#B7C4CC" }}>NextGen Bio: student research, ideas and podcasts</div>
      </div>
    ),
    size,
  );
}
