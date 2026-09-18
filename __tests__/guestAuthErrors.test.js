import { getGuestAuthErrorMessage } from '../lib/guestAuthErrors';

describe('guest authentication error messages', () => {
  test.each([
    ['auth/admin-restricted-operation', '禁止建立訪客帳號'],
    ['auth/operation-not-allowed', '開啟匿名登入'],
    ['auth/unauthorized-domain', '網域'],
    ['auth/network-request-failed', '網路連線'],
    ['unavailable', '網路連線'],
    ['firestore/unavailable', '網路連線'],
    ['auth/too-many-requests', '服務限制'],
    ['auth/quota-exceeded', '服務限制'],
    ['permission-denied', 'guest_users'],
    ['firestore/permission-denied', 'guest_users'],
  ])('explains %s with an actionable message', (code, expected) => {
    expect(getGuestAuthErrorMessage({ code })).toContain(expected);
  });

  test('does not expose arbitrary provider error messages', () => {
    const message = getGuestAuthErrorMessage({ code: 'unknown', message: 'private request data' });
    expect(message).toContain('訪客登入失敗');
    expect(message).not.toContain('private request data');
    expect(getGuestAuthErrorMessage(null)).toBe(message);
  });
});
