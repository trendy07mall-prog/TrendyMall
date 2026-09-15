// ProductGallery's zoom state, kept pure so its transitions are unit-testable
// under plain node:test (no DOM).
export type GalleryZoomState = { viewerOpen: boolean; hoverZoom: boolean };

export type GalleryZoomAction =
  | { type: "pointerEnter"; pointerType: string }
  | { type: "pointerLeave" }
  | { type: "openViewer" }
  | { type: "closeViewer" };

export const INITIAL_GALLERY_ZOOM: GalleryZoomState = { viewerOpen: false, hoverZoom: false };

export function galleryZoomReducer(state: GalleryZoomState, action: GalleryZoomAction): GalleryZoomState {
  switch (action.type) {
    case "pointerEnter":
      // A touch tap fires enter events too, and on touch nothing ever sends
      // the matching leave -- so only a real mouse may start hover zoom.
      return action.pointerType === "mouse" ? { ...state, hoverZoom: true } : state;
    case "pointerLeave":
      return state.hoverZoom ? { ...state, hoverZoom: false } : state;
    case "openViewer":
      return { viewerOpen: true, hoverZoom: false };
    case "closeViewer":
      return { viewerOpen: false, hoverZoom: false };
  }
}
