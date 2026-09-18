import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AuthScreen from '../components/AuthScreen';

const props = {
  tab: 'login', email: '', password: '', nickname: '', avatar: '😊', color: '#8b5cf6',
  busy: false, guestBusy: false, authError: '',
};

describe('login presentation contract', () => {
  test('keeps all login options without a theme selector', () => {
    const html = renderToStaticMarkup(<AuthScreen {...props} />);
    expect(html).toContain('使用 Google 繼續');
    expect(html).toContain('以訪客身分進入');
    expect(html).toContain('立即註冊');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).not.toContain('theme-toggle');
    expect(html).not.toContain('幽影深窗');
  });

  test.each(['busy', 'guestBusy'])('disables every login control during %s', key => {
    const html = renderToStaticMarkup(<AuthScreen {...props} {...{ [key]: true }} />);
    const controls = html.match(/<(?:input|button)\b[^>]*>/g);
    expect(controls).toHaveLength(7);
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
});
