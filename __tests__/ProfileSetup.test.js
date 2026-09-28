import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import ProfileSetup from '../components/ProfileSetup';

let dom, root, container, props;
beforeEach(() => {
  dom = new JSDOM('<div id="test"></div>', { url: 'http://localhost/' });
  global.window = dom.window; global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  URL.createObjectURL = jest.fn(() => 'blob:local-avatar'); URL.revokeObjectURL = jest.fn();
  container = document.querySelector('#test'); root = createRoot(container);
  props = { nickname: 'Evon', avatar: '😊', color: '#6366f1', setNickname: jest.fn(), setAvatar: jest.fn(), setColor: jest.fn(), onSubmit: jest.fn() };
});
afterEach(async () => { await act(async () => root.unmount()); dom.window.close(); });
const render = async (extra={}) => act(async () => root.render(<ProfileSetup {...props} {...extra}/>));
const pick = async file => act(async () => Simulate.change(container.querySelector('input[type=file]'), { target: { files: [file], value: 'selected' } }));

test('photo preview and form submission pass the actual selected file; release blob on unmount', async () => {
  await render(); const file = new File(['photo'], 'avatar.png', { type: 'image/png' });
  await pick(file);
  expect(container.querySelector('img[alt="頭像預覽"]').src).toBe('blob:local-avatar');
  await act(async () => Simulate.submit(container.querySelector('form')));
  expect(props.onSubmit).toHaveBeenCalledWith(file, true);
  await act(async () => root.render(null));
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-avatar');
});
test('rejects non-images and oversized photos without submitting them', async () => {
  await render();
  await pick(new File(['x'], 'script.svg', {type:'image/svg+xml'}));
  expect(container.querySelector('[role=alert]')).not.toBeNull();
  await pick({name:'huge.png',type:'image/png',size:20*1024*1024+1});
  expect(container.querySelector('[role=alert]').textContent).toContain('20');
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
test('choosing an emoji does not upload the previously selected photo', async () => {
  await render({initialPhoto:'https://example.test/avatar.png'});
  await act(async () => container.querySelector('[aria-label="頭像 🦊"]').click());
  await act(async () => Simulate.submit(container.querySelector('form')));
  expect(props.onSubmit).toHaveBeenCalledWith(null, false);
});
test('blank and busy states cannot submit and no installation banner appears', async () => {
  await render({nickname:'  '});
  expect(container.querySelector('[type=submit]').disabled).toBe(true);
  await act(async () => Simulate.submit(container.querySelector('form')));
  expect(props.onSubmit).not.toHaveBeenCalled();
  await render({busy:true});
  container.querySelectorAll('button,input').forEach(element=>expect(element.disabled).toBe(true));
  expect(container.textContent).not.toContain('安裝');
});
