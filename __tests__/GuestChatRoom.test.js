import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import GuestChatRoom, { isGuestSubmitKey } from '../components/GuestChatRoom';

describe('guest chat presentation', () => {
  test('shows the fixed companion, greeting, reply levels and four styles', () => {
    const html = renderToStaticMarkup(<GuestChatRoom user={{ uid: 'guest-test' }} />);

    expect(html).toContain('<h1>EVON</h1>');
    expect(html).not.toContain('a22215987321@gmail.com');
    expect(html).toContain('src="/evon-avatar.png"');
    expect(html).not.toContain('guest-header-subtitle');
    expect(html).not.toContain('新聊天 · GPT5.6 SOL');
    expect(html).toContain('你好，我是 GPT5.6 SOL，有甚麼能幫你的嗎？');
    expect(html).toContain('<option value="HIGH" selected="">HIGH</option>');
    expect(html).toContain('<option value="EXTRA">EXTRA</option>');
    expect(html).toContain('aria-controls="guest-theme-options"');
    expect(html).toContain('<span>外觀</span>');
    expect(html).not.toContain('id="guest-theme-options"');
    expect(html).toContain('data-guest-theme="shadow-window"');
    expect(html).toContain('placeholder="輸入訊息…"');
    expect(html).not.toContain('class="guest-badge"');
  });

  test('only plain Enter submits and protects Shift+Enter and IME composition', () => {
    expect(isGuestSubmitKey({ key: 'Enter', shiftKey: false, isComposing: false })).toBe(true);
    expect(isGuestSubmitKey({ key: 'Enter', shiftKey: true, isComposing: false })).toBe(false);
    expect(isGuestSubmitKey({ key: 'Enter', shiftKey: false, isComposing: true })).toBe(false);
    expect(isGuestSubmitKey({ key: 'a', shiftKey: false, isComposing: false })).toBe(false);
  });

  test('keeps the workspace neutral with a light toolbar and tailless messages', () => {
    const html = renderToStaticMarkup(<GuestChatRoom user={{ uid: 'guest-test' }} />);
    const rule = selector => html.match(new RegExp(`${selector.replaceAll('.', '\\.')} \\{([^}]+)\\}`))[1];

    expect(rule('.guest-main')).toContain('background: #fafafa');
    expect(rule('.guest-main')).toContain('color-scheme: light');
    expect(rule('.guest-header')).toContain('height: 64px');
    expect(rule('.guest-header')).toContain('border-bottom: 1px solid #ececec');
    expect(rule('.guest-header')).toContain('box-shadow: none');
    expect(rule('.guest-message-column, .guest-composer-column')).toContain('width: calc(100% / 3)');
    expect(rule('.guest-level-control')).toContain('width: fit-content');
    expect(rule('.guest-level-control')).toContain('min-width: 96px');
    expect(rule('.guest-level-control')).toContain('height: 45px');
    expect(rule('.guest-level-control')).toContain('padding: 0 14px');
    expect(rule('.guest-level-control')).toContain('gap: 10px');
    expect(rule('.guest-level-select')).toContain('appearance: none');
    const bubble = rule('.guest-bubble');
    ['background: #fff', 'color: #202020', 'border: 1px solid #e7e7e7', 'border-radius: 16px', '680px', 'box-shadow: none'].forEach(style => {
      expect(bubble).toContain(style);
    });
    expect(bubble).not.toContain('gradient');
    expect(rule('.guest-composer')).toContain('background: #fff');
    expect(rule('.guest-composer:focus-within')).toContain('box-shadow: none');
    expect(html).toContain('class="guest-companion-content"');
  });

  test('renders the compact sidebar, centre third and fitted reply control', () => {
    const html = renderToStaticMarkup(<GuestChatRoom user={{ uid: 'guest-test' }} />);
    const rule = selector => html.match(new RegExp(`${selector.replaceAll('.', '\\.')} \\{([^}]+)\\}`))[1];

    expect(rule('.guest-root')).toContain('grid-template-columns: 280px minmax(0, 1fr)');
    expect(rule('.guest-sidebar')).toContain('width: 280px');
    expect(rule('.guest-sidebar')).toContain('height: 100dvh');
    expect(rule('.guest-list')).toContain('overflow-y: auto');
    expect(rule('.guest-message-column, .guest-composer-column')).toContain('width: calc(100% / 3)');
    const level = rule('.guest-level-control');
    ['width: fit-content', 'min-width: 96px', 'height: 45px', 'padding: 0 14px', 'gap: 10px'].forEach(style => {
      expect(level).toContain(style);
    });
    expect(html).toContain('<span class="guest-section-label">對話</span>');
    expect(html).toContain('aria-label="開啟側邊欄"');
  });

  test('includes the mobile welcome, real task-template entry and accessible history search', () => {
    const html = renderToStaticMarkup(<GuestChatRoom user={{ uid: 'guest-test' }} />);
    expect(html).toContain('今天，想從哪裡開始？');
    expect(html).toContain('aria-label="開啟 Skills 任務範本"');
    expect(html).toContain('aria-label="搜尋對話"');
    expect(html).toContain('aria-label="建立新聊天"');
    expect(html).toContain('@media (max-width: 767px)');
    expect(html).toContain('height: var(--guest-viewport-height, 100dvh)');
    expect(html).toContain('grid-template-rows: minmax(0, 1fr)');
    expect(html).toContain('env(safe-area-inset-bottom)');
  });

  test('keeps static CSS selectors unescaped for identical server/client rendering', () => {
    const html = renderToStaticMarkup(<GuestChatRoom user={{ uid: 'guest-test' }} />);
    const css = html.match(/<style>([\s\S]+?)<\/style>/)[1];
    expect(css).toContain('[data-guest-theme="shadow-window"]');
    expect(css).not.toContain('&quot;');
    expect(css).toContain('.guest-header-new { display: none; }');
  });
});
