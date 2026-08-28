/**
 * scrollLockGuard.ts
 *
 * Radix primitives (Dialog, Sheet/Drawer, AlertDialog — all used throughout
 * this app) lock body scroll while open via `react-remove-scroll`. In this
 * Radix version that shows up as a `data-scroll-locked` attribute on
 * <html> plus an injected <style> tag forcing `overflow: hidden` on
 * <body>. Both are removed automatically when the primitive unmounts
 * cleanly.
 *
 * The problem: that cleanup only runs on a *normal* unmount. If something
 * throws while a modal is open — a render error anywhere in the tree, not
 * necessarily inside the modal itself — React can tear the tree down
 * without ever running that effect cleanup. The lock is left behind
 * permanently: the page looks frozen/unscrollable even though nothing is
 * visibly open anymore, and it stays that way until a full reload. This
 * matches "can't scroll" + "crashes sometimes" being reported together —
 * they're very likely the same incident.
 *
 * clearScrollLock() force-removes every leak vector we know of. It's safe
 * to call even when nothing is actually locked (all removals are no-ops in
 * that case), so it's called defensively on every route change and from
 * the top-level ErrorBoundary rather than trying to detect "is this a real
 * leak" first.
 */

export function clearScrollLock() {
  const html = document.documentElement;
  const body = document.body;

  // react-remove-scroll's own marker (Radix >=1.1)
  html.removeAttribute("data-scroll-locked");

  // Direct inline overflow/scrollbar-compensation locks, however they got set
  for (const el of [html, body]) {
    el.style.removeProperty("overflow");
    el.style.removeProperty("padding-right");
    el.style.removeProperty("margin-right");
  }

  // Some react-remove-scroll versions inject a <style> tag (id starts with
  // "react-remove-scroll" or targets body { overflow: hidden }) rather than
  // only using inline styles — strip anything matching so no CSS rule keeps
  // scrolling blocked even after the attribute is gone.
  document
    .querySelectorAll('style[data-radix-scroll-lock], style[id^="react-remove-scroll"]')
    .forEach((el) => el.remove());
}
