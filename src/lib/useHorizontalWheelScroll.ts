import { useCallback, useRef } from "react";

/**
 * Lets a plain vertical mouse wheel scroll a horizontally-scrolling container
 * (drag/buttons/touch already work natively) — the common horizontal-carousel
 * convention (GitHub's language bar, Netflix rows, etc).
 *
 * If the container has CSS scroll-snap, `mandatory` snapping fights small
 * wheel deltas: it snaps straight back to the current tile before the
 * movement is even visible, so slow/gentle scrolling appears to do nothing
 * and only a big, fast flick "works." Snapping is suspended for the
 * duration of active wheel input and restored once it settles, so scrolling
 * stays smooth while snap-to-tile still kicks in once you stop.
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

    let snapTimeout: number | undefined;

    const handleWheel = (event: WheelEvent) => {
      if (node.scrollWidth <= node.clientWidth) return; // nothing to scroll
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return; // let real horizontal gestures (trackpad, shift+wheel) through untouched

      const atStart = node.scrollLeft <= 0;
      const atEnd = node.scrollLeft + node.clientWidth >= node.scrollWidth - 1;
      if ((event.deltaY < 0 && atStart) || (event.deltaY > 0 && atEnd)) return; // at the edge: let the page scroll instead of trapping the cursor

      event.preventDefault();

      node.style.scrollSnapType = "none";
      window.clearTimeout(snapTimeout);
      snapTimeout = window.setTimeout(() => {
        node.style.scrollSnapType = "";
      }, 150);

      node.scrollLeft += event.deltaY;
    };

    // Native, non-passive listener so preventDefault() reliably works.
    node.addEventListener("wheel", handleWheel, { passive: false });
    cleanupRef.current = () => {
      node.removeEventListener("wheel", handleWheel);
      window.clearTimeout(snapTimeout);
    };
  }, []);

  return [ref, nodeRef] as const;
}
