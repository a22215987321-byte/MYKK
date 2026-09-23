// Keep an anchored menu inside the visible viewport (including a mobile keyboard).
export function getPopoverPosition(anchor, size, viewport, placement = "bottom-right", offset = 6, margin = 12) {
  const minLeft = viewport.left + margin;
  const minTop = viewport.top + margin;
  const maxRight = viewport.left + viewport.width - margin;
  const maxBottom = viewport.top + viewport.height - margin;
  const maxWidth = Math.max(0, viewport.width - margin * 2);
  const width = Math.min(size.width, maxWidth);
  const above = Math.max(0, anchor.top - offset - minTop);
  const below = Math.max(0, maxBottom - anchor.bottom - offset);
  const preferAbove = placement.startsWith("top");
  const openAbove = preferAbove
    ? size.height <= above || above > below
    : size.height > below && above > below;
  const maxHeight = Math.min(Math.max(0, viewport.height - margin * 2), openAbove ? above : below);
  const height = Math.min(size.height, maxHeight);
  const alignedLeft = placement.endsWith("left") ? anchor.left : anchor.right - width;
  return {
    left: Math.max(minLeft, Math.min(alignedLeft, maxRight - width)),
    top: Math.max(minTop, Math.min(openAbove ? anchor.top - offset - height : anchor.bottom + offset, maxBottom - height)),
    maxWidth,
    maxHeight,
  };
}
