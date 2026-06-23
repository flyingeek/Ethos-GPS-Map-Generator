import { readable } from "svelte/store";

export const isIOS = readable(false, (set) => {
    const ua = navigator.userAgent || "";
    const isiOS = /iPad|iPhone|iPod/i.test(ua);
    const isIPadOSDesktopUA =
        navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    set(isiOS || isIPadOSDesktopUA);
});
