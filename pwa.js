// PWA bootstrap kept separate from the game so install support stays isolated.
if (typeof document !== "undefined") {
  const manifest = document.createElement("link");
  manifest.rel = "manifest";
  manifest.href = "/manifest.webmanifest";
  document.head.appendChild(manifest);

  const themeColor = document.createElement("meta");
  themeColor.name = "theme-color";
  themeColor.content = "#080806";
  document.head.appendChild(themeColor);

  const appleCapable = document.createElement("meta");
  appleCapable.name = "apple-mobile-web-app-capable";
  appleCapable.content = "yes";
  document.head.appendChild(appleCapable);

  const appleTitle = document.createElement("meta");
  appleTitle.name = "apple-mobile-web-app-title";
  appleTitle.content = "Elden Chill";
  document.head.appendChild(appleTitle);
}

const canRegisterServiceWorker =
  typeof window !== "undefined" &&
  typeof navigator !== "undefined" &&
  "serviceWorker" in navigator &&
  globalThis.location?.protocol === "https:";

if (canRegisterServiceWorker) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[PWA] Service worker registration failed", error);
    });
  });
}
