import { useRouter } from "next/router";
import LoadingState from "../../components/LoadingState";
import ProfileView from "../../components/ProfileView";

// Standalone, shareable/direct-link version of the profile page. The full
// UI lives in components/ProfileView.js, shared with the inline version
// rendered inside ChatRoom's Feed pane (see ChatRoom.js's viewProfileUid
// state) — clicking a post author there never has to land here.
export default function ProfilePublicPage() {
  const router = useRouter();
  const { uid } = router.query;

  if (!router.isReady) {
    return <LoadingState label="載入中..." />;
  }

  return <ProfileView uid={uid} />;
}
