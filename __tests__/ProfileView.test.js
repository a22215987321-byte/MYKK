import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import ProfileView from '../components/ProfileView';
import { onSnapshot, updateDoc } from 'firebase/firestore';

jest.mock('next/router', () => ({ useRouter: () => ({ isReady: true, query: {} }) }));
jest.mock('next/link', () => function Link({ href, children, ...props }) { return <a href={href} {...props}>{children}</a>; });
jest.mock('../lib/firebase', () => ({ auth: {}, db: {} }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: (_, cb) => { cb({ uid: 'viewer' }); return () => {}; } }));
jest.mock('firebase/firestore', () => ({
  doc: (_, ...parts) => ({ parts }), collection: (_, ...parts) => ({ parts }), query: ref => ref,
  where: () => ({}), orderBy: () => ({}), onSnapshot: jest.fn(),
  getDocs: async () => ({ docs: [] }), updateDoc: jest.fn(async () => {}),
  addDoc: jest.fn(), serverTimestamp: () => ({}),
  arrayUnion: value => ({ add: value }), arrayRemove: value => ({ remove: value }),
}));
jest.mock('../components/Feed', () => ({ MediaBookmarkMenu: () => null }));
jest.mock('../components/ThemeToggle', () => () => null);
jest.mock('../components/MyStickersPanel', () => () => null);
jest.mock('../components/VideoPlayer', () => () => null);
jest.mock('../components/ImageCropModal', () => () => null);
jest.mock('../components/MobileTabBarLayout', () => () => null);
jest.mock('../components/ProfileAvatar', () => () => <div data-avatar />);
jest.mock('../lib/notificationSound', () => ({ getNotificationVolume: () => 70 }));

let dom, root, container;
const profile = { uid: 'friend', nickname: '晴天', status: 'offline', statusText: '愛琪琪',
  friends: ['viewer'], createdAt: new Date(2025, 0, 1), subscribers: [] };
beforeEach(() => {
  dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  global.window = dom.window; global.document = dom.window.document;
  global.localStorage = dom.window.localStorage; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.innerWidth = 390;
  onSnapshot.mockImplementation((ref, cb) => {
    cb({ id: ref.parts[1], exists: () => true, data: () => ref.parts[1] === 'friend' ? profile : { nickname: '我', friends: ['friend'] } });
    return () => {};
  });
  container = document.getElementById('root'); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); dom.window.close(); jest.clearAllMocks();
  delete global.window; delete global.document; delete global.localStorage; delete global.IS_REACT_ACT_ENVIRONMENT;
});

test('profile status is plain text directly under the name and the return button stays outside scroller', async () => {
  const onClose = jest.fn();
  await act(async () => root.render(<ProfileView uid="friend" embedded onClose={onClose} />));
  const status = container.querySelector('[data-profile-status]');
  expect(status.textContent).toBe('愛琪琪');
  expect(status.previousElementSibling.querySelector('h1').textContent).toBe('晴天');
  expect(status.querySelector('span')).toBeNull();
  expect(container.querySelector('[data-profile-content] [data-profile-back]')).toBeNull();
  await act(async () => container.querySelector('[aria-label="返回動態消息"]').click());
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('compact profile keeps subscription/message/more actions and four stats', async () => {
  await act(async () => root.render(<ProfileView uid="friend" embedded />));
  const actions = container.querySelector('[data-profile-actions]');
  expect(actions.querySelector('a').getAttribute('href')).toBe('/?chat=friend');
  const subscribe = [...actions.querySelectorAll('button')].find(b => b.textContent.includes('訂閱'));
  await act(async () => subscribe.click());
  expect(updateDoc).toHaveBeenCalledWith({ parts: ['users', 'friend'] }, { subscribers: { add: 'viewer' } });
  expect(container.querySelector('[data-profile-stats]').children).toHaveLength(4);
  expect(container.querySelector('[data-profile-stats]').textContent).toContain('2025/01');
  await act(async () => actions.querySelector('[aria-label="更多選項"]').click());
  expect(actions.textContent).toContain('檢舉');
  expect(actions.textContent).toContain('封鎖');
});
