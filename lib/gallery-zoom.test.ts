import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  galleryZoomReducer,
  INITIAL_GALLERY_ZOOM,
  type GalleryZoomAction,
  type GalleryZoomState,
} from "./gallery-zoom";

const run = (actions: GalleryZoomAction[], from: GalleryZoomState = INITIAL_GALLERY_ZOOM) =>
  actions.reduce(galleryZoomReducer, from);

describe("galleryZoomReducer", () => {
  test("mouse hover zooms, leaving unzooms", () => {
    assert.equal(run([{ type: "pointerEnter", pointerType: "mouse" }]).hoverZoom, true);
    assert.equal(
      run([{ type: "pointerEnter", pointerType: "mouse" }, { type: "pointerLeave" }]).hoverZoom,
      false,
    );
  });

  test("touch and pen pointers never start hover zoom", () => {
    for (const pointerType of ["touch", "pen", ""]) {
      assert.deepEqual(run([{ type: "pointerEnter", pointerType }]), INITIAL_GALLERY_ZOOM);
    }
  });

  test("touch tap -> viewer opens -> viewer closes ends unzoomed", () => {
    const state = run([
      { type: "pointerEnter", pointerType: "touch" },
      { type: "openViewer" },
      { type: "closeViewer" },
    ]);
    assert.deepEqual(state, { viewerOpen: false, hoverZoom: false });
  });

  test("opening the viewer drops an active hover zoom", () => {
    const state = run([{ type: "pointerEnter", pointerType: "mouse" }, { type: "openViewer" }]);
    assert.deepEqual(state, { viewerOpen: true, hoverZoom: false });
  });

  test("closing the viewer always returns to the unzoomed state", () => {
    for (const hoverZoom of [true, false]) {
      assert.deepEqual(galleryZoomReducer({ viewerOpen: true, hoverZoom }, { type: "closeViewer" }), {
        viewerOpen: false,
        hoverZoom: false,
      });
    }
  });

  test("mouse hover zoom works again after the viewer closes", () => {
    const state = run([
      { type: "pointerEnter", pointerType: "mouse" },
      { type: "openViewer" },
      { type: "closeViewer" },
      { type: "pointerEnter", pointerType: "mouse" },
    ]);
    assert.equal(state.hoverZoom, true);
  });
});
