// Bouchon DOM minimal, pour executer le vrai moteur du jeu hors navigateur.
//
// Le but n'est pas de simuler un navigateur mais d'en offrir juste assez pour
// que les modules s'importent : le jeu touche au DOM au chargement (audio,
// canvas, observateurs), et sans ces objets rien ne se charge.
//
// Tout est inerte. Aucun appel n'a d'effet, et c'est voulu : un simulateur
// d'equilibrage ne doit rien afficher ni rien sauvegarder.

const noop = () => {};

const inertElement = new Proxy(
  {},
  {
    get(target, key) {
      switch (key) {
        case "classList":
          return { add: noop, remove: noop, toggle: noop, contains: () => false };
        case "style":
          return new Proxy({}, { get: () => noop, set: () => true });
        case "getContext":
          return () => new Proxy({}, { get: () => noop });
        case "getBoundingClientRect":
          return () => ({ width: 0, height: 0, top: 0, bottom: 0, left: 0, right: 0 });
        case "children":
        case "childNodes":
          return [];
        case "dataset":
          return {};
        case "value":
        case "textContent":
        case "innerText":
        case "innerHTML":
          return "";
        default:
          return typeof key === "symbol" ? undefined : noop;
      }
    },
    set: () => true,
  },
);

export const mountDomStub = () => {
  if (globalThis.document) return;

  globalThis.window = globalThis;
  globalThis.addEventListener = noop;
  globalThis.removeEventListener = noop;
  globalThis.setInterval = noop;
  globalThis.matchMedia = () => ({ matches: false, addEventListener: noop, addListener: noop });
  globalThis.document = {
    getElementById: () => inertElement,
    querySelector: () => inertElement,
    querySelectorAll: () => [],
    createElement: () => inertElement,
    createDocumentFragment: () => inertElement,
    addEventListener: noop,
    removeEventListener: noop,
    body: inertElement,
    documentElement: inertElement,
    activeElement: null,
  };
  globalThis.localStorage = {
    getItem: () => null,
    setItem: noop,
    removeItem: noop,
    clear: noop,
  };
  globalThis.sessionStorage = globalThis.localStorage;
  globalThis.Image = class {
    set src(_value) {}
  };
  globalThis.Audio = class {
    play() {
      return Promise.resolve();
    }
    pause() {}
    addEventListener() {}
  };
  globalThis.requestAnimationFrame = noop;
  globalThis.cancelAnimationFrame = noop;
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };
  globalThis.location = { hostname: "localhost", href: "http://localhost/", reload: noop };
  globalThis.alert = noop;
  globalThis.confirm = () => false;
  globalThis.fetch = () => Promise.reject(new Error("reseau desactive en simulation"));
  globalThis.cytoscape = () => inertElement;
};
