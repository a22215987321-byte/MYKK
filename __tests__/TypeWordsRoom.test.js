import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import TypeWordsRoom from '../components/TypeWordsRoom';
import ChatMoreMenu from '../components/ChatMoreMenu';

let dom, root, container;
beforeEach(() => {
  dom = new JSDOM('<main></main>', { url: 'https://www.evonchat.com/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.querySelector('main');
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); dom.window.close(); });
const render = props => act(async () => root.render(<TypeWordsRoom {...props} />));

test('does not load TypeWords until its workspace is actually activated', async () => {
  await render({ active: false });
  expect(container.querySelector('iframe')).toBeNull();
  await render({ active: true });
  const frame = container.querySelector('iframe');
  expect(frame.title).toBe('TypeWords 英語練習');
  expect(frame.getAttribute('src')).toBe('/apps/typewords/words');
  expect(frame.getAttribute('src')).not.toMatch(/uid|token|auth|user/);
});

test('changing tabs preserves practice state and sends only active state to the same origin', async () => {
  await render({ active: true });
  const frame = container.querySelector('iframe');
  const post = jest.spyOn(frame.contentWindow, 'postMessage').mockImplementation(() => {});
  await act(async () => Simulate.load(frame));
  expect(post).toHaveBeenLastCalledWith({ type: 'evonchat:typewords-active', active: true }, 'https://www.evonchat.com');
  await render({ active: false });
  expect(container.querySelector('iframe')).toBe(frame);
  expect(post).toHaveBeenLastCalledWith({ type: 'evonchat:typewords-active', active: false }, 'https://www.evonchat.com');
  await render({ active: true });
  expect(container.querySelector('iframe')).toBe(frame);
  expect(post.mock.calls.every(([message, origin]) => Object.keys(message).sort().join() === 'active,type' && origin === 'https://www.evonchat.com')).toBe(true);
});

test('a load finishing after the tab is hidden synchronizes the paused state', async () => {
  await render({ active: true });
  const frame = container.querySelector('iframe');
  const post = jest.spyOn(frame.contentWindow, 'postMessage').mockImplementation(() => {});
  await render({ active: false });
  await act(async () => Simulate.load(frame));
  expect(post).toHaveBeenLastCalledWith({ type: 'evonchat:typewords-active', active: false }, 'https://www.evonchat.com');
});

test('late child readiness receives the current activity state and rejects other origins or sources', async () => {
  await render({ active: true });
  const frame = container.querySelector('iframe');
  const post = jest.spyOn(frame.contentWindow, 'postMessage').mockImplementation(() => {});
  const ready = overrides => window.dispatchEvent(new window.MessageEvent('message', {
    origin: window.location.origin, source: frame.contentWindow,
    data: { type: 'evonchat:typewords-ready' }, ...overrides,
  }));
  await act(async () => {
    ready({ origin: 'https://other.example' });
    ready({ source: window });
    ready({ data: { type: 'unexpected-message' } });
  });
  expect(post).not.toHaveBeenCalled();
  await act(async () => ready());
  expect(post).toHaveBeenLastCalledWith({ type: 'evonchat:typewords-active', active: true }, 'https://www.evonchat.com');
  await render({ active: false });
  post.mockClear();
  await act(async () => ready());
  expect(post).toHaveBeenCalledTimes(1);
  expect(post).toHaveBeenLastCalledWith({ type: 'evonchat:typewords-active', active: false }, 'https://www.evonchat.com');
  await act(async () => root.render(null));
  post.mockClear();
  await act(async () => ready());
  expect(post).not.toHaveBeenCalled();
});

test('mobile return stays in EVONCHAT and desktop adds no duplicate toolbar', async () => {
  await render({ active: true });
  expect(container.querySelector('header')).toBeNull();
  const close = jest.fn();
  await render({ active: true, onClose: close });
  const button = container.querySelector('[aria-label="返回功能選單"]');
  expect(button).not.toBeNull();
  await act(async () => button.click());
  expect(close).toHaveBeenCalledTimes(1);
  expect(container.querySelector('[data-workspace-gesture-lock="true"]')).not.toBeNull();
  expect(container.querySelector('[data-disable-drawer-swipe="true"]')).not.toBeNull();
});

test('mobile English menu opens the TypeWords feature with its dedicated setter', async () => {
  const setShowTypeWords = jest.fn();
  const onOpen = jest.fn(setter => setter(true));
  await act(async () => root.render(<ChatMoreMenu state={{}} setters={{ setShowTypeWords }} onOpen={onOpen} />));
  const button = [...container.querySelectorAll('button')].find(item => item.textContent.includes('TypeWords'));
  expect(button).not.toBeNull();
  await act(async () => button.click());
  expect(onOpen).toHaveBeenCalledWith(setShowTypeWords);
  expect(setShowTypeWords).toHaveBeenCalledWith(true);
});

