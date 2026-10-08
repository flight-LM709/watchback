// jsdom lacks PointerEvent and matchMedia; polyfill just enough for component tests.
if (typeof window !== "undefined") {
  if (!("PointerEvent" in window)) {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number;
      pointerType: string;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
        this.pointerType = init.pointerType ?? "mouse";
      }
    }
    (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventPolyfill;
  }
  if (!window.matchMedia) {
    const state = { reduce: false, coarse: false };
    (window as unknown as { __setReducedMotion: (v: boolean) => void }).__setReducedMotion = (v) => {
      state.reduce = v;
    };
    // Touch device: "(pointer: coarse)" / "(hover: none)" match.
    (window as unknown as { __setCoarsePointer: (v: boolean) => void }).__setCoarsePointer = (v) => {
      state.coarse = v;
    };
    window.matchMedia = ((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? state.reduce : /pointer:\s*coarse|hover:\s*none/.test(query) ? state.coarse : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }
}
