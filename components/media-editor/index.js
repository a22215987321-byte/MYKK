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
