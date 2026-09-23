import { getPopoverPosition } from "../lib/popoverPosition";

const viewport = { left: 0, top: 0, width: 390, height: 844 };
const size = { width: 280, height: 420 };

describe("viewport-bounded profile menus", () => {
  test("flips the upward profile menu down when there is no room above", () => {
    const anchor = { left: 230, right: 300, top: 140, bottom: 180 };
    const pos = getPopoverPosition(anchor, size, viewport, "top-right");
    expect(pos.top).toBe(186);
    expect(pos.left).toBe(20);
    expect(pos.top + size.height).toBeLessThanOrEqual(832);
  });

  test("opens above a settings button near the bottom", () => {
    const anchor = { left: 320, right: 378, top: 750, bottom: 790 };
    expect(getPopoverPosition(anchor, size, viewport).top).toBe(324);
  });

  test("keeps a left-aligned avatar menu inside a narrow viewport", () => {
    const pos = getPopoverPosition({ left: 2, right: 86, top: 100, bottom: 184 },
      { width: 200, height: 108 }, viewport, "bottom-left");
    expect(pos.left).toBe(12);
    expect(pos.top).toBe(190);
  });

  test("constrains tall menus so they can scroll instead of being clipped", () => {
    const pos = getPopoverPosition({ left: 140, right: 200, top: 110, bottom: 150 },
      { width: 280, height: 800 }, { ...viewport, height: 400 });
    expect(pos.maxHeight).toBe(232);
    expect(pos.top + pos.maxHeight).toBe(388);
  });

  test("accounts for visual viewport offsets and a mobile keyboard", () => {
    const visible = { left: 30, top: 100, width: 320, height: 300 };
    const pos = getPopoverPosition({ left: 280, right: 350, top: 180, bottom: 220 }, size, visible);
    expect(pos.left).toBeGreaterThanOrEqual(42);
    expect(pos.top).toBeGreaterThanOrEqual(112);
    expect(pos.left + Math.min(size.width, pos.maxWidth)).toBeLessThanOrEqual(338);
    expect(pos.top + pos.maxHeight).toBeLessThanOrEqual(388);
  });

  test("keeps the preferred direction when the full menu fits", () => {
    const anchor = { left: 800, right: 860, top: 600, bottom: 644 };
    const pos = getPopoverPosition(anchor, size, { ...viewport, width: 1366, height: 900 }, "top-right");
    expect(pos.top).toBe(174);
    expect(pos.left).toBe(580);
  });
});
