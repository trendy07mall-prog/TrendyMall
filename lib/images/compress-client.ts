/**
 * What the admin UI calls to compress one file, or a batch.
 *
 * ADMIN ONLY. Nothing outside components/admin imports this, so none of it
 * -- nor encoder.ts -- reaches the storefront bundle. The UI also pulls it
 * in through a dynamic import(), so it stays out of the admin's initial
 * JavaScript until somebody actually picks a file.
 *
 * WHY THERE IS NO WEB WORKER HERE, despite that being the obvious place
 * for one. It was written and then removed, because under Turbopack (which
 * `next build` uses) `new Worker(new URL("./x.worker.ts", import.meta.url))`
 * does not produce a compiled module worker: the .ts file is emitted into
 * static/media untranspiled and served as `video/mp2t` -- the MIME type for
 * an MPEG transport stream, which is also what ".ts" means to a web server.
 * Constructing a Worker from it fires an error event every time. Verified
 * against a production build, not assumed.
 *
 * Keeping it would have meant a guaranteed failed worker spawn per session
 * for no benefit. The main thread is also less of a compromise than it
 * sounds: the two expensive steps, createImageBitmap and convertToBlob,
 * are both asynchronous browser-internal operations that already run off
 * the main thread. Only the drawImage blit is synchronous.
 *
 * If a worker is wanted later, the options are a self-contained worker
 * file with no imports (duplicating this logic -- not worth it), or
 * whatever Turbopack ships for worker entries once it handles them.
 */

import type { CompressResult } from "./compress";
import type { ImageKind } from "./targets";

/**
 * Compresses one file for one upload field.
 *
 * Always resolves -- every failure is a {ok:false, message} result, never a
 * throw -- so a caller working through a batch can carry on to the next
 * file, and an upload field can never be left stuck "busy" with nothing
 * shown.
 */
export async function compressForUpload(file: File, kind: ImageKind): Promise<CompressResult> {
  const [{ compressImage }, { createBrowserEncoder }] = await Promise.all([
    import("./compress"),
    import("./encoder"),
  ]);
  return compressImage(file, kind, () => createBrowserEncoder());
}
