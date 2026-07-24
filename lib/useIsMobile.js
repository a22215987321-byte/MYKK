import { useState, useEffect } from "react";

// Single source of truth for the mobile/desktop layout breakpoint. Used to
// be redefined separately in ChatRoom.js (768), MobileTabBarLayout.js (768)
// and PageNotes.js (680) — those disagreed with each other, so the same
// viewport width could count as "mobile" in one component and "desktop" in
// another.
export const MOBILE_BREAKPOINT = 768;

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}
