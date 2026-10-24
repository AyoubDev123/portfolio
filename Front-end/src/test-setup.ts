import "@testing-library/jest-dom/vitest";

// jsdom n'implémente pas IntersectionObserver (utilisé par useReveal pour les
// animations au scroll) : on simule un élément toujours visible.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly scrollMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this,
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

// Affectation directe (pas vi.stubGlobal) : certains tests appellent
// vi.unstubAllGlobals() dans leur afterEach, ce qui retirerait le polyfill.
globalThis.IntersectionObserver = MockIntersectionObserver;
