const ua = navigator.userAgent || "";
const isiOS = /iPad|iPhone|iPod/i.test(ua);
const isIPadOSDesktopUA =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

export const isIOS = $state(isiOS || isIPadOSDesktopUA);
