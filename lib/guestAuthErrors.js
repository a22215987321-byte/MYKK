// Keep provider/configuration failures distinct from network and database errors.
// Never display raw provider messages, which can include request details.
export function getGuestAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/admin-restricted-operation':
      return '伺服器目前禁止建立訪客帳號。請管理員確認 Firebase 已啟用匿名登入，且未限制使用者建立帳號。';
    case 'auth/operation-not-allowed':
      return '訪客登入尚未啟用。請管理員在 Firebase Authentication 開啟匿名登入。';
    case 'auth/unauthorized-domain':
      return '此網站網域尚未獲得登入授權，請聯絡管理員。';
    case 'auth/network-request-failed':
    case 'unavailable':
    case 'firestore/unavailable':
      return '無法連線到訪客服務，請檢查網路連線後再試一次。';
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return '訪客登入暫時達到服務限制，請稍後再試。';
    case 'permission-denied':
    case 'firestore/permission-denied':
      return '訪客資料存取尚未獲得授權。請管理員檢查 Firestore 的 guest_users 權限規則。';
    default:
      return '訪客登入失敗，請稍後再試；若持續發生，請聯絡管理員。';
  }
}
