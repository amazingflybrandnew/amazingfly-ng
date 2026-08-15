/**
 * Shared scroll helper for the flight/hotel selection flows.
 * Brings freshly-revealed content (confirmation panels, next steps) into view
 * right after it renders, so customers never have to hunt for the result of a click.
 */

export function scrollElementIntoView(
  element: HTMLElement | null | undefined,
  block: ScrollLogicalPosition = "center",
) {
  if (!element || typeof window === "undefined") return;
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
        block,
        inline: "nearest",
      });
    });
  });
}
