import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  compressImage,
  dimensionLadder,
  fitWithin,
  isTooSmall,
  outputFileName,
  type DecodedImage,
  type ImageEncoder,
} from "./compress";
import { IMAGE_TARGETS, compressionNote, formatBytes, uploadHint } from "./targets";
import { detectFormat, formatName, isAccepted, rejectionMessageForFormat } from "./sniff";

/* ------------------------------------------------------------------ */
/* fixtures                                                            */
/* ------------------------------------------------------------------ */

const SIGNATURES = {
  jpeg: [0xff, 0xd8, 0xff, 0xe0],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  gif: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  bmp: [0x42, 0x4d],
  tiff: [0x49, 0x49, 0x2a, 0x00],
} as const;

function bytesWith(signature: readonly number[], total: number): Uint8Array<ArrayBuffer> {
  const u8 = new Uint8Array(new ArrayBuffer(Math.max(total, signature.length)));
  u8.set(signature, 0);
  return u8;
}

/** RIFF....WEBP -- the brand sits at offset 8, after the length word. */
function webpBytes(total = 64): Uint8Array<ArrayBuffer> {
  const u8 = new Uint8Array(new ArrayBuffer(Math.max(total, 16)));
  u8.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  u8.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP"
  return u8;
}

/** ....ftypheic -- an iPhone photo. */
function heicBytes(brand = "heic", total = 64): Uint8Array<ArrayBuffer> {
  const u8 = new Uint8Array(new ArrayBuffer(Math.max(total, 16)));
  u8.set([0x00, 0x00, 0x00, 0x18], 0);
  u8.set([0x66, 0x74, 0x79, 0x70], 4); // "ftyp"
  for (let i = 0; i < 4; i++) u8[8 + i] = brand.charCodeAt(i);
  return u8;
}

function fileOf(name: string, bytes: Uint8Array<ArrayBuffer>, declaredType = ""): File {
  return new File([bytes], name, { type: declaredType });
}

const jpegFile = (name: string, size: number, declaredType = "image/jpeg") =>
  fileOf(name, bytesWith(SIGNATURES.jpeg, size), declaredType);

/* ------------------------------------------------------------------ */
/* a fake encoder, so the whole ladder runs without a browser          */
/* ------------------------------------------------------------------ */

interface FakeOptions {
  decoded?: Partial<DecodedImage>;
  /** Bytes the encoder "produces". Default models a real-ish encoder. */
  sizeFor?: (o: { width: number; height: number; quality: number; type: string }) => number;
  /** What the browser actually hands back -- the Safari lever. */
  typeFor?: (requested: string) => string;
  decodeThrows?: boolean;
  encodeThrows?: boolean;
  /** Records every encode call, so tests can assert the ladder order. */
  calls?: { width: number; height: number; quality: number; type: string }[];
}

function fakeEncoder(options: FakeOptions = {}): () => ImageEncoder {
  const {
    decoded = {},
    sizeFor = (o) => Math.round((o.width * o.height * o.quality) / 1000),
    typeFor = (requested) => requested,
    decodeThrows = false,
    encodeThrows = false,
    calls,
  } = options;

  return () => ({
    async decode() {
      if (decodeThrows) throw new Error("out of memory");
      return { width: 2000, height: 2000, hasAlpha: false, ...decoded } as DecodedImage;
    },
    async encode(o) {
      if (encodeThrows) throw new Error("out of memory");
      calls?.push({ ...o });
      const type = typeFor(o.type);
      const size = sizeFor({ ...o, type });
      return { blob: new Blob([new Uint8Array(new ArrayBuffer(1))], { type }), type, size };
    },
    dispose() {},
  });
}

/* ------------------------------------------------------------------ */

describe("detectFormat reads the real type from the bytes", () => {
  test("recognises each accepted format", () => {
    assert.equal(detectFormat(bytesWith(SIGNATURES.jpeg, 32)), "jpeg");
    assert.equal(detectFormat(bytesWith(SIGNATURES.png, 32)), "png");
    assert.equal(detectFormat(webpBytes()), "webp");
  });

  test("recognises the formats we reject, so the message can be specific", () => {
    assert.equal(detectFormat(bytesWith(SIGNATURES.gif, 32)), "gif");
    assert.equal(detectFormat(heicBytes("heic")), "heic");
    assert.equal(detectFormat(heicBytes("mif1")), "heic");
    assert.equal(detectFormat(bytesWith(SIGNATURES.bmp, 32)), "bmp");
    assert.equal(detectFormat(bytesWith(SIGNATURES.tiff, 32)), "tiff");
  });

  test("an SVG is named rather than reported as unrecognised", () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    assert.equal(detectFormat(svg), "svg");
    const withDecl = new TextEncoder().encode('<?xml version="1.0"?>\n<svg></svg>');
    assert.equal(detectFormat(withDecl), "svg");
  });

  test("a renamed file is caught: the bytes decide, not the name or the type", () => {
    // A HEIC photo renamed to .jpg, which is what phones actually produce.
    assert.equal(detectFormat(heicBytes()), "heic");
    assert.ok(!isAccepted(detectFormat(heicBytes())));
  });

  test("random bytes are unknown rather than guessed at", () => {
    assert.equal(detectFormat(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])), "unknown");
    assert.equal(detectFormat(new Uint8Array([])), "unknown");
    assert.equal(detectFormat(new Uint8Array([0xff])), "unknown");
  });

  test("isAccepted allows exactly JPG, PNG and WebP", () => {
    assert.ok(isAccepted("jpeg") && isAccepted("png") && isAccepted("webp"));
    for (const f of ["gif", "heic", "avif", "bmp", "tiff", "svg", "unknown"] as const) {
      assert.ok(!isAccepted(f), `${f} must not be accepted`);
    }
  });
});

describe("rejection messages say what was found, what is allowed, what to do", () => {
  test("HEIC gets the camera-settings instruction", () => {
    const m = rejectionMessageForFormat("IMG_4821.jpg", "heic");
    assert.match(m, /IMG_4821\.jpg/);
    assert.match(m, /HEIC/);
    assert.match(m, /Most Compatible/);
    assert.match(m, /JPG, PNG or WebP/);
  });

  test("GIF gets its own message mentioning animation", () => {
    const m = rejectionMessageForFormat("banner.gif", "gif");
    assert.match(m, /banner\.gif/);
    assert.match(m, /animation/i);
    assert.match(m, /JPG, PNG or WebP/);
  });

  test("an unrecognised file explains that renaming does not convert", () => {
    const m = rejectionMessageForFormat("logo.jpg", "unknown");
    assert.match(m, /logo\.jpg/);
    assert.match(m, /renamed/i);
  });

  test("every message names the file and the allowed list", () => {
    for (const f of ["gif", "heic", "avif", "bmp", "tiff", "svg", "unknown"] as const) {
      const m = rejectionMessageForFormat("some-file.x", f);
      assert.match(m, /some-file\.x/, `${f} message must name the file`);
      assert.match(m, /JPG, PNG or WebP/, `${f} message must list what is allowed`);
    }
  });

  test("formatName is human-readable", () => {
    assert.equal(formatName("jpeg"), "JPG");
    assert.equal(formatName("webp"), "WebP");
    assert.equal(formatName("unknown"), "an unrecognised file type");
  });
});

describe("fitWithin preserves aspect ratio and never upscales", () => {
  test("a large landscape photo fits inside the box", () => {
    assert.deepEqual(fitWithin(4000, 3000, 1000, 1000), { width: 1000, height: 750 });
  });

  test("a large portrait photo fits on the other axis", () => {
    assert.deepEqual(fitWithin(3000, 4000, 1000, 1000), { width: 750, height: 1000 });
  });

  test("a small image is left exactly as it is -- never enlarged", () => {
    assert.deepEqual(fitWithin(300, 300, 600, 600), { width: 300, height: 300 });
    assert.deepEqual(fitWithin(640, 360, 1920, 650), { width: 640, height: 360 });
  });

  test("a wide banner is bounded by height, not width", () => {
    assert.deepEqual(fitWithin(3840, 1300, 1920, 650), { width: 1920, height: 650 });
  });

  test("never returns a zero dimension", () => {
    const d = fitWithin(10000, 1, 100, 100);
    assert.ok(d.width >= 1 && d.height >= 1);
  });
});

describe("isTooSmall uses the target floor", () => {
  test("a product photo under 600 on the short side is too small", () => {
    assert.ok(isTooSmall(1200, 500, IMAGE_TARGETS.product));
    assert.ok(!isTooSmall(1200, 800, IMAGE_TARGETS.product));
    assert.ok(!isTooSmall(600, 600, IMAGE_TARGETS.product));
  });

  test("banners use half the recommended size", () => {
    assert.ok(isTooSmall(900, 300, IMAGE_TARGETS.heroDesktop));
    assert.ok(!isTooSmall(960, 325, IMAGE_TARGETS.heroDesktop));
  });
});

describe("dimensionLadder steps down and stops at the floor", () => {
  test("starts at the given size and shrinks", () => {
    const ladder = dimensionLadder({ width: 1000, height: 1000 }, IMAGE_TARGETS.product);
    assert.deepEqual(ladder[0], { width: 1000, height: 1000 });
    assert.ok(ladder.length > 1);
  });

  test("never goes below the target minimum", () => {
    const ladder = dimensionLadder({ width: 1000, height: 1000 }, IMAGE_TARGETS.product);
    for (const step of ladder) {
      assert.ok(
        step.width >= IMAGE_TARGETS.product.minWidth && step.height >= IMAGE_TARGETS.product.minHeight,
        `${step.width}x${step.height} fell under the floor`,
      );
    }
  });

  test("an image already at the floor yields exactly one step", () => {
    const ladder = dimensionLadder({ width: 600, height: 600 }, IMAGE_TARGETS.product);
    assert.equal(ladder.length, 1);
  });

  test("is always finite", () => {
    const ladder = dimensionLadder({ width: 1920, height: 650 }, IMAGE_TARGETS.heroDesktop);
    assert.ok(ladder.length <= 21);
  });
});

describe("outputFileName makes a tidy, correct extension", () => {
  test("swaps the extension for the real output format", () => {
    assert.equal(outputFileName("Product Photo.JPG", "webp"), "product-photo.webp");
    assert.equal(outputFileName("Product Photo.JPG", "jpeg"), "product-photo.jpg");
  });

  test("a HEIC-ish or dotted name still comes out clean", () => {
    assert.equal(outputFileName("IMG_4821.heic", "webp"), "img-4821.webp");
    assert.equal(outputFileName("my.photo.v2.png", "webp"), "my-photo-v2.webp");
  });

  test("a name with nothing usable still produces a file name", () => {
    assert.equal(outputFileName("___.png", "webp"), "image.webp");
    assert.equal(outputFileName("", "webp"), "image.webp");
  });
});

describe("compressImage: the happy paths", () => {
  test("a small image is accepted and only the format changes -- no upscaling", async () => {
    const calls: FakeOptions["calls"] = [];
    const result = await compressImage(
      jpegFile("small.jpg", 20 * 1024),
      "product",
      fakeEncoder({ decoded: { width: 700, height: 700 }, sizeFor: () => 18 * 1024, calls }),
    );
    assert.ok(result.ok, result.ok ? "" : result.message);
    assert.equal(result.width, 700, "must not be enlarged to 1000");
    assert.equal(result.height, 700);
    assert.equal(result.format, "webp");
    assert.equal(calls[0].quality, 85, "should start at the top of the quality ladder");
  });

  test("a 200 KB image comes out under the 150 KB product target", async () => {
    const source = 200 * 1024;
    const result = await compressImage(
      jpegFile("photo.jpg", source),
      "product",
      // Shrinks with quality, crossing the target only below q85.
      fakeEncoder({ sizeFor: (o) => Math.round(160 * 1024 * (o.quality / 85) ** 3) }),
    );
    assert.ok(result.ok, result.ok ? "" : result.message);
    assert.ok(result.toBytes <= IMAGE_TARGETS.product.maxBytes, `got ${result.toBytes}`);
    assert.equal(result.fromBytes, source);
  });

  test("the note reads the way the spec asks", async () => {
    const result = await compressImage(
      jpegFile("product-1.jpg", Math.round(2.4 * 1024 * 1024)),
      "product",
      fakeEncoder({ decoded: { width: 3000, height: 3000 }, sizeFor: () => 138 * 1024 }),
    );
    assert.ok(result.ok);
    assert.equal(result.note, "product-1.jpg compressed from 2.4 MB to 138 KB (WebP, 1000 × 1000)");
  });

  test("quality is tried before size is reduced", async () => {
    const calls: FakeOptions["calls"] = [];
    await compressImage(
      jpegFile("p.jpg", 900 * 1024),
      "product",
      fakeEncoder({
        calls,
        // Only ever passes at the smallest quality, so the full ladder runs.
        sizeFor: (o) => (o.quality === 75 ? 10 * 1024 : 900 * 1024),
      }),
    );
    assert.deepEqual(
      calls.slice(0, 3).map((c) => c.quality),
      [85, 80, 75],
      "quality ladder must be exhausted at the first size",
    );
    assert.equal(calls[0].width, 1000, "and all at the full fitted size");
    assert.equal(calls[1].width, 1000);
    assert.equal(calls[2].width, 1000);
  });

  test("when quality is not enough, the size steps down", async () => {
    const calls: FakeOptions["calls"] = [];
    const result = await compressImage(
      jpegFile("p.jpg", 900 * 1024),
      "product",
      fakeEncoder({
        calls,
        // Passes only once the width has come down.
        sizeFor: (o) => (o.width <= 900 ? 100 * 1024 : 900 * 1024),
      }),
    );
    assert.ok(result.ok, result.ok ? "" : result.message);
    assert.ok(result.width < 1000, `expected a reduced width, got ${result.width}`);
    assert.ok(result.width >= IMAGE_TARGETS.product.minWidth);
    assert.equal(calls[3].width, 900, "second size level is 90% of the first");
  });

  test("a transparent logo keeps its alpha and stays WebP", async () => {
    const result = await compressImage(
      fileOf("logo.png", bytesWith(SIGNATURES.png, 40 * 1024), "image/png"),
      "logo",
      fakeEncoder({ decoded: { width: 600, height: 600, hasAlpha: true }, sizeFor: () => 20 * 1024 }),
    );
    assert.ok(result.ok, result.ok ? "" : result.message);
    assert.equal(result.format, "webp", "WebP carries alpha; it must not fall back to JPEG");
  });

  test("each hero target is applied independently", async () => {
    const desktop = await compressImage(
      jpegFile("hero.jpg", 2 * 1024 * 1024),
      "heroDesktop",
      fakeEncoder({ decoded: { width: 3840, height: 1300 }, sizeFor: () => 190 * 1024 }),
    );
    assert.ok(desktop.ok);
    assert.deepEqual([desktop.width, desktop.height], [1920, 650]);

    // The same encoder output is over the stricter mobile budget.
    const mobile = await compressImage(
      jpegFile("hero.jpg", 2 * 1024 * 1024),
      "heroMobile",
      fakeEncoder({ decoded: { width: 2400, height: 1350 }, sizeFor: () => 190 * 1024 }),
    );
    assert.ok(!mobile.ok, "190 KB must not pass the 120 KB mobile hero target");
  });
});

describe("compressImage: rejections", () => {
  test("a file over 5 MB is rejected, naming its size and the limit", async () => {
    const result = await compressImage(
      jpegFile("huge.jpg", 6 * 1024 * 1024),
      "product",
      fakeEncoder(),
    );
    assert.ok(!result.ok);
    assert.equal(result.code, "too-large");
    assert.match(result.message, /huge\.jpg/);
    assert.match(result.message, /6 MB/);
    assert.match(result.message, /5 MB/);
  });

  test("a HEIC file gets the HEIC message even when named .jpg", async () => {
    const result = await compressImage(
      fileOf("IMG_0042.jpg", heicBytes(), "image/jpeg"),
      "product",
      fakeEncoder(),
    );
    assert.ok(!result.ok);
    assert.equal(result.code, "bad-format");
    assert.match(result.message, /Most Compatible/);
  });

  test("a GIF is rejected with the GIF message", async () => {
    const result = await compressImage(
      fileOf("spin.gif", bytesWith(SIGNATURES.gif, 1024), "image/gif"),
      "product",
      fakeEncoder(),
    );
    assert.ok(!result.ok);
    assert.equal(result.code, "bad-format");
    assert.match(result.message, /animation/i);
  });

  test("a text file renamed to .png is rejected on its contents", async () => {
    const result = await compressImage(
      fileOf("fake.png", new TextEncoder().encode("this is not an image at all"), "image/png"),
      "product",
      fakeEncoder(),
    );
    assert.ok(!result.ok);
    assert.equal(result.code, "bad-format");
    assert.match(result.message, /fake\.png/);
  });

  test("a too-small image is rejected, saying what it is and what is needed", async () => {
    const result = await compressImage(
      jpegFile("tiny.jpg", 5 * 1024),
      "product",
      fakeEncoder({ decoded: { width: 320, height: 240 } }),
    );
    assert.ok(!result.ok);
    assert.equal(result.code, "too-small");
    assert.match(result.message, /tiny\.jpg/);
    assert.match(result.message, /320 × 240/);
    assert.match(result.message, /600 × 600/);
  });

  test("an image that cannot reach the target is refused, not stored oversized", async () => {
    const result = await compressImage(
      jpegFile("noisy.jpg", 4 * 1024 * 1024),
      "product",
      fakeEncoder({ sizeFor: () => 400 * 1024 }),
    );
    assert.ok(!result.ok);
    assert.equal(result.code, "cannot-reach-target");
    assert.match(result.message, /noisy\.jpg/);
    assert.match(result.message, /150 KB/);
    assert.match(result.message, /not uploaded/);
  });

  test("a decode failure never falls back to uploading the original", async () => {
    const result = await compressImage(
      jpegFile("broken.jpg", 100 * 1024),
      "product",
      fakeEncoder({ decodeThrows: true }),
    );
    assert.ok(!result.ok);
    assert.equal(result.code, "decode-failed");
    assert.match(result.message, /not uploaded/);
  });

  test("an encode failure (out of memory) is reported, not swallowed", async () => {
    const result = await compressImage(
      jpegFile("big.jpg", 4 * 1024 * 1024),
      "product",
      fakeEncoder({ encodeThrows: true }),
    );
    assert.ok(!result.ok);
    assert.equal(result.code, "encode-failed");
    assert.match(result.message, /memory/i);
    assert.match(result.message, /not uploaded/);
  });

  test("a zero-dimension decode is treated as unreadable", async () => {
    const result = await compressImage(
      jpegFile("empty.jpg", 1024),
      "product",
      fakeEncoder({ decoded: { width: 0, height: 0 } }),
    );
    assert.ok(!result.ok);
    assert.equal(result.code, "decode-failed");
  });
});

describe("the Safari path: canvas silently returns PNG instead of WebP", () => {
  test("an opaque photo falls back to JPEG and still meets the target", async () => {
    const calls: FakeOptions["calls"] = [];
    const result = await compressImage(
      jpegFile("photo.jpg", 2 * 1024 * 1024),
      "product",
      fakeEncoder({
        calls,
        decoded: { width: 2000, height: 2000, hasAlpha: false },
        // What Safari does: asked for webp, hands back png.
        typeFor: (requested) => (requested === "image/webp" ? "image/png" : requested),
        sizeFor: (o) => (o.type === "image/jpeg" ? 120 * 1024 : 2 * 1024 * 1024),
      }),
    );
    assert.ok(result.ok, result.ok ? "" : result.message);
    assert.equal(result.format, "jpeg");
    assert.ok(result.toBytes <= IMAGE_TARGETS.product.maxBytes);
    assert.equal(result.file.name, "photo.jpg");
    assert.equal(calls[0].type, "image/webp", "WebP is always attempted first");
    assert.equal(calls[1].type, "image/jpeg", "then JPEG, at the same size and quality");
    assert.equal(calls[1].quality, calls[0].quality);
    assert.equal(calls[1].width, calls[0].width);
  });

  test("the PNG the browser handed back is never uploaded", async () => {
    const result = await compressImage(
      jpegFile("photo.jpg", 2 * 1024 * 1024),
      "product",
      fakeEncoder({
        typeFor: (r) => (r === "image/webp" ? "image/png" : r),
        // The PNG would be under target -- it still must not be used.
        sizeFor: (o) => (o.type === "image/png" ? 10 * 1024 : 100 * 1024),
      }),
    );
    assert.ok(result.ok);
    assert.equal(result.format, "jpeg", "a PNG under the target is still the wrong format");
    assert.equal(result.file.type, "image/jpeg");
  });

  test("a TRANSPARENT image is refused rather than silently flattened", async () => {
    const result = await compressImage(
      fileOf("logo.png", bytesWith(SIGNATURES.png, 50 * 1024), "image/png"),
      "logo",
      fakeEncoder({
        decoded: { width: 600, height: 600, hasAlpha: true },
        typeFor: (r) => (r === "image/webp" ? "image/png" : r),
        sizeFor: () => 10 * 1024,
      }),
    );
    assert.ok(!result.ok);
    assert.equal(result.code, "no-webp-with-alpha");
    assert.match(result.message, /logo\.png/);
    assert.match(result.message, /transparent/i);
    assert.match(result.message, /Chrome, Edge or Firefox/);
  });

  test("a browser that cannot produce WebP or JPEG is reported, never guessed at", async () => {
    const result = await compressImage(
      jpegFile("photo.jpg", 500 * 1024),
      "product",
      fakeEncoder({ typeFor: () => "image/png", sizeFor: () => 10 * 1024 }),
    );
    assert.ok(!result.ok);
    assert.equal(result.code, "encode-failed");
    assert.match(result.message, /not uploaded/);
  });
});

describe("targets config drives the hints and notes", () => {
  test("every target has a coherent box and floor", () => {
    for (const [kind, t] of Object.entries(IMAGE_TARGETS)) {
      assert.ok(t.maxBytes > 0, `${kind} maxBytes`);
      assert.ok(t.minWidth <= t.maxWidth, `${kind}: floor wider than the box`);
      assert.ok(t.minHeight <= t.maxHeight, `${kind}: floor taller than the box`);
      assert.ok(t.label.length > 0, `${kind} label`);
    }
  });

  test("the approved numbers are the ones in the config", () => {
    assert.equal(IMAGE_TARGETS.product.maxBytes, 150 * 1024);
    assert.deepEqual([IMAGE_TARGETS.product.maxWidth, IMAGE_TARGETS.product.maxHeight], [1000, 1000]);
    assert.equal(IMAGE_TARGETS.heroDesktop.maxBytes, 200 * 1024);
    assert.deepEqual([IMAGE_TARGETS.heroDesktop.maxWidth, IMAGE_TARGETS.heroDesktop.maxHeight], [1920, 650]);
    assert.equal(IMAGE_TARGETS.heroMobile.maxBytes, 120 * 1024);
    assert.deepEqual([IMAGE_TARGETS.heroMobile.maxWidth, IMAGE_TARGETS.heroMobile.maxHeight], [1200, 675]);
    assert.equal(IMAGE_TARGETS.banner.maxBytes, 100 * 1024);
    assert.equal(IMAGE_TARGETS.category.maxBytes, 30 * 1024);
    assert.equal(IMAGE_TARGETS.category.minWidth, 256);
    assert.equal(IMAGE_TARGETS.logo.minWidth, 300);
    assert.equal(IMAGE_TARGETS.icon.minWidth, 180);
  });

  test("the hint is generated from the target, so it cannot drift", () => {
    assert.equal(uploadHint("product"), "Auto-compressed to under 150 KB · WebP · about 1000 × 1000 px");
    assert.equal(
      uploadHint("heroMobile"),
      "Auto-compressed to under 120 KB · WebP · about 1200 × 675 px",
    );
    // Every kind produces a usable hint.
    for (const kind of Object.keys(IMAGE_TARGETS) as (keyof typeof IMAGE_TARGETS)[]) {
      assert.match(uploadHint(kind), /^Auto-compressed to under .+ · WebP · about \d+ × \d+ px$/);
    }
  });

  test("formatBytes reads naturally at both scales", () => {
    assert.equal(formatBytes(150 * 1024), "150 KB");
    assert.equal(formatBytes(Math.round(2.4 * 1024 * 1024)), "2.4 MB");
    assert.equal(formatBytes(5 * 1024 * 1024), "5 MB");
  });

  test("compressionNote names the JPEG fallback as JPEG", () => {
    assert.equal(
      compressionNote({ name: "a.jpg", fromBytes: 1024 * 1024, toBytes: 90 * 1024, width: 800, height: 600, format: "jpeg" }),
      "a.jpg compressed from 1 MB to 90 KB (JPEG, 800 × 600)",
    );
  });
});
