import { useEffect } from "react";

// UI-only measurements: reserve readable scroll space for overlaid controls,
// including collapsed toolbars, text zoom, safe areas and mobile keyboard resize.
export default function useOverlayHeight(elementRef, containerRef, property, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const element = elementRef.current;
    const container = containerRef.current;
    if (!element || !container) return;
    const previousValue = container.style.getPropertyValue(property);
    const measure = () => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      if (height <= 0 || container.style.getPropertyValue(property) === `${height}px`) return;
      const scroller = container.querySelector('[data-ai-messages="true"], [data-chat-scroll="true"]');
      const atBottom = scroller?.clientHeight > 0 && scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop <= 32;
      container.style.setProperty(property, `${height}px`);
      if (atBottom) scroller.scrollTop = scroller.scrollHeight;
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      if (previousValue) container.style.setProperty(property, previousValue);
      else container.style.removeProperty(property);
    };
  }, [elementRef, containerRef, property, enabled]);
}
