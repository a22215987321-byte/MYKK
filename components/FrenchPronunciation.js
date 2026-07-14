import PronunciationPage from "./pronunciation/PronunciationPage";
import { FRENCH_SOUNDS, FRENCH_CATEGORIES } from "../lib/frenchPronunciationData";

export default function FrenchPronunciation({ user, db, onNav }) {
  return (
    <PronunciationPage
      backLabel="← 法語學習"
      onBack={() => (onNav ? onNav("home") : window.history.back())}
      emoji="🎵"
      title="法語發音"
      subtitle="點擊卡片展開・🐢 慢速・🔊 正常速度・跟讀練習"
      categories={FRENCH_CATEGORIES}
      items={FRENCH_SOUNDS}
      footerTip="💡 建議先熟悉口腔母音，再學鼻母音和半母音，最後攻克子音與連音規則"
      accentColor="#2563eb"
      showCompletion
    />
  );
}
