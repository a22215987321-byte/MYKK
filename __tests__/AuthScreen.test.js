import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AuthScreen from '../components/AuthScreen';

const props = {
  tab: 'login', email: '', password: '', nickname: '', avatar: '😊', color: '#8b5cf6',
  busy: false, guestBusy: false, authError: '',
};

describe('login presentation contract', () => {
  test('places the logo before the brand name without the removed subtitle', () => {
    for (const tab of ['login', 'register']) {
      const html = renderToStaticMarkup(<AuthScreen {...props} tab={tab} />);
      expect(html).not.toContain('聊天社交平台');
      expect(html.indexOf('/logo.png')).toBeLessThan(html.indexOf('EVONCHAT'));
    }
  });

  test('keeps all login options without a theme selector', () => {
    const html = renderToStaticMarkup(<AuthScreen {...props} />);
    expect(html).toContain('使用 Google 繼續');
    expect(html).toContain('以訪客身分進入');
    expect(html).toContain('立即註冊');
    expect(html).toContain('使用 Email 登入');
    expect(html).not.toContain('as-password');
    expect(html).not.toContain('Apple');
    expect(html).not.toContain('theme-toggle');
    expect(html).not.toContain('幽影深窗');
  });

  test.each(['busy', 'guestBusy'])('disables every login control during %s', key => {
    const html = renderToStaticMarkup(<AuthScreen {...props} {...{ [key]: true }} />);
    const controls = html.match(/<(?:input|button)\b[^>]*>/g);
    expect(controls.length).toBeGreaterThanOrEqual(4);
    controls.forEach(control => expect(control).toContain('disabled=""'));
    expect(html).toContain('aria-busy="true"');
  });

  test('preserves registration fields, avatar choices and Google login', () => {
    const html = renderToStaticMarkup(<AuthScreen {...props} tab="register" />);
    expect(html).toContain('id="as-nickname"');
    expect(html).toContain('autoComplete="new-password"');
    expect(html.match(/aria-label="頭像 /g)).toHaveLength(12);
    expect(html.match(/aria-label="底色 /g)).toHaveLength(8);
    expect(html).toContain('使用 Google 繼續');
  });

  test('renders errors accessibly and escapes their text', () => {
    const html = renderToStaticMarkup(<AuthScreen {...props} authError="<error>" />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('&lt;error&gt;');
  });

  test('a selected email expands the real login form', () => {
    const html = renderToStaticMarkup(<AuthScreen {...props} email="person@example.test" />);
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('person@example.test');
  });

  test('remembered accounts have distinct restore and forget controls', () => {
    const html = renderToStaticMarkup(<AuthScreen {...props} savedAccounts={[{ uid: 'one', nickname: 'One', email: 'one@example.test' }]} />);
    expect(html).toContain('已儲存的帳號');
    expect(html).toContain('從此裝置移除 One');
  });
});
