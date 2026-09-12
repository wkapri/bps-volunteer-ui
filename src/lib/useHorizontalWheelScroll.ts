import { useCallback, useRef } from "react";

/**
 * Lets a plain vertical mouse wheel scroll a horizontally-scrolling container
 * (drag/buttons/touch already work natively) — the common horizontal-carousel
 * convention (GitHub's language bar, Netflix rows, etc).
 *
 * Returns `[ref, nodeRef]`: pass `ref` to the scrollable element, and read
 * `nodeRef.current` if you need the DOM node elsewhere (e.g. prev/next
 * buttons). A callback ref, not a plain `useRef`, so it re-attaches
 * correctly if the element is conditionally rendered and mounts later
 * (e.g. an empty/loading state that later gets real content).
 */
export function useHorizontalWheelScroll<T extends HTMLElement>() {
  const nodeRef = useRef<T | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const ref = useCallback((node: T | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    nodeRef.current = node;
    if (!node) return;

    const handleWheel = (event: WheelEvent) => {
      if (node.scrollWidth <= node.clientWidth) return; // nothing to scroll
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return; // let real horizontal gestures (trackpad, shift+wheel) through untouched

      const atStart = node.scrollLeft <= 0;
      const atEnd = node.scrollLeft + node.clientWidth >= node.scrollWidth - 1;
      if ((event.deltaY < 0 && atStart) || (event.deltaY > 0 && atEnd)) return; // at the edge: let the page scroll instead of trapping the cursor

      event.preventDefault();
      node.scrollLeft += event.deltaY;
    };

    // Native, non-passive listener so preventDefault() reliably works.
    node.addEventListener("wheel", handleWheel, { passive: false });
    cleanupRef.current = () => node.removeEventListener("wheel", handleWheel);
  }, []);

  return [ref, nodeRef] as const;
}
