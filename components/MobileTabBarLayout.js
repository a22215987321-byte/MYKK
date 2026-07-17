import { useState, useEffect } from "react";
import ChatMobileTabBar from "./ChatMobileTabBar";

// Mobile-only, fixed-to-bottom slot for the shared tab bar, for standalone pages
// that live outside ChatRoom's own shell (e.g. /feed, /profile/[uid]) — so the
// bottom nav stays visible no matter what page the user is on. Renders nothing
// on desktop. Pages using this must reserve matching bottom padding on their own
// scroll container (see .feed-page-root / .pp-root) so content isn't hidden behind it.
export default function MobileTabBarLayout({ activeTab, pendingCount = 0 }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isMobile) return null;

  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 500 }}>
      <ChatMobileTabBar activeTab={activeTab} pendingCount={pendingCount} />
    </div>
  );
}
