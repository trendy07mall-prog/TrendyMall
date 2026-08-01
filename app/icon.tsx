import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// The TM-mark-only crop of the new logo (public/images/logo/trendymall-logo.png)
// — wordmark excluded, it's illegible at this size. Read from disk and
// inlined as a data URI: ImageResponse/Satori can't resolve a relative
// /public path at render time, only a data URI or an absolute fetchable URL.
export default async function Icon() {
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
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri} alt="" width={30} height={14} style={{ objectFit: "contain" }} />
      </div>
    ),
    { ...size },
  );
}
