import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#111111",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 140,
            height: 140,
            borderRadius: 24,
            background: "#111111",
            color: "#ffffff",
            fontSize: 72,
            fontWeight: 800,
            marginBottom: 32,
          }}
        >
          T
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>
          TrendyMall
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#666666", marginTop: 12 }}>
          Premium Mobile Phone Accessories · Sri Lanka
        </div>
      </div>
    ),
    { ...size },
  );
}
