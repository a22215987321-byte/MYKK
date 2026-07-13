// pages/chat.js
import { useEffect } from 'react';
import { auth } from '../lib/firebase';

export default function ChatPage() {
  useEffect(() => {
    // 如果未登入，強制跳回首頁
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (!user) {
        window.location.href = '/';
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <h1 className="text-3xl">🎉 登入成功！歡迎來到美食交流大廳</h1>
    </div>
  );
}