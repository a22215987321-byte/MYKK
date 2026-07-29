import dynamic from "next/dynamic";
import LoadingState from "../LoadingState";

// mediabunny is a large, purely browser/WebCodecs-based library — lazy-load
// with ssr:false the same way components/media-editor/index.js does for
// fabric.js, so it never ends up in the SSR bundle for pages that don't open
// this room.
export const DocConvertRoomLazy = dynamic(() => import("./DocConvertRoom"), {
  ssr: false,
  loading: () => <LoadingState label="載入轉換工具..." minHeight="100%" />,
});
