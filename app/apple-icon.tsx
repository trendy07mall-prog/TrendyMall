import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// White background, not transparent — iOS applies its own rounded-square
// mask to touch icons and a transparent background can render
// unpredictably (sometimes black) depending on iOS version.
export default async function AppleIcon() {
  const mark = await readFile(join(process.cwd(), "public/images/logo/trendymall-mark.png"));
  const dataUri = `data:image/png;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri} alt="" width={130} height={59} style={{ objectFit: "contain" }} />
      </div>
    ),
    { ...size },
  );
}
