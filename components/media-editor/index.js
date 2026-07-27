import dynamic from "next/dynamic";
import LoadingState from "../LoadingState";

// fabric.js touches `document`/`window` at import time, so these must never
// be part of the server bundle — dynamic + ssr:false keeps the whole editor
// (and its ~300KB of fabric code) out of every page that doesn't open it.
export const PhotoEditorLazy = dynamic(() => import("./PhotoEditor"), {
  ssr: false,
  loading: () => <LoadingState label="載入編輯器..." minHeight="100dvh" />,
});

export const VideoEditorLazy = dynamic(() => import("./VideoEditor"), {
  ssr: false,
  loading: () => <LoadingState label="載入編輯器..." minHeight="100dvh" />,
});

// Inline layout for the standalone 圖片編輯室 — same fabric.js core as
// PhotoEditorLazy, laid out to embed in the page instead of a fullscreen
// overlay (see components/media-editor/PhotoEditorEmbedded.js).
export const PhotoEditorEmbeddedLazy = dynamic(() => import("./PhotoEditorEmbedded"), {
  ssr: false,
  // Matches the loaded component's own height:100% instead of a fixed px
  // value, so there's no height jump the moment the real editor mounts —
  // the parent (ImageEditorRoom's flex/minHeight wrapper) already bounds it.
  loading: () => <LoadingState label="載入編輯器..." minHeight="100%" />,
});
