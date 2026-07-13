import { useState } from "react";
import IeltsBand4Home from "./IeltsBand4Home";
import IeltsBand4Vocab from "./IeltsBand4Vocab";
import IeltsBand4Listening from "./IeltsBand4Listening";
import IeltsBand4Speaking from "./IeltsBand4Speaking";

export default function IeltsBand4({ onNav }) {
  const [view, setView] = useState("band4"); // band4 | vocabulary | listening | speaking

  function handleNav(target) {
    if (target === "home") { onNav && onNav("home"); return; }
    setView(target);
  }

  if (view === "vocabulary") return <IeltsBand4Vocab onNav={handleNav} />;
  if (view === "listening") return <IeltsBand4Listening onNav={handleNav} />;
  if (view === "speaking") return <IeltsBand4Speaking onNav={handleNav} />;
  return <IeltsBand4Home onNav={handleNav} />;
}
