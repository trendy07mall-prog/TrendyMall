import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The full logo (mark + wordmark) already conveys "TrendyMall" visually —
// no separate text line duplicating it, same reasoning as the header/footer.
// Background/tagline stay on the existing black-and-white system; only the
// logo image itself carries the new navy/orange brand colors.
export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public/images/logo/trendymall-logo.png"));
  const dataUri = `data:image/png;base64,${logo.toString("base64")}`;

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri} alt="" width={340} height={202} style={{ objectFit: "contain" }} />
        <div style={{ display: "flex", fontSize: 28, color: "#666666", marginTop: 24 }}>
          Premium Mobile Phone Accessories · Sri Lanka
        </div>
      </div>
    ),
    { ...size },
  );
}
