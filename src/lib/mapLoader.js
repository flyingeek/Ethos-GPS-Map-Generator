const MAPLIBRE_VERSION = "5.1.1";
const MAPLIBRE_CSS_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
const MAPLIBRE_JS_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;

function ensureMapLibreCss() {
    if (
        document.querySelector(
            `link[data-maplibre-css="${MAPLIBRE_VERSION}"]`,
        )
    ) {
        return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = MAPLIBRE_CSS_URL;
    link.setAttribute("data-maplibre-css", MAPLIBRE_VERSION);
    document.head.appendChild(link);
}

async function ensureMapLibreJs() {
    if (window.maplibregl) {
        return window.maplibregl;
    }

    const existing = document.querySelector(
        `script[data-maplibre-js="${MAPLIBRE_VERSION}"]`,
    );

    if (existing) {
        await new Promise((resolve, reject) => {
            if (window.maplibregl) {
                resolve();
                return;
            }
            existing.addEventListener("load", () => resolve(), {
                once: true,
            });
            existing.addEventListener(
                "error",
                () => reject(new Error("Failed to load MapLibre script.")),
                { once: true },
            );
        });
        return window.maplibregl;
    }

    const script = document.createElement("script");
    script.src = MAPLIBRE_JS_URL;
    script.defer = true;
    script.setAttribute("data-maplibre-js", MAPLIBRE_VERSION);

    await new Promise((resolve, reject) => {
        script.addEventListener("load", () => resolve(), { once: true });
        script.addEventListener(
            "error",
            () => reject(new Error("Failed to load MapLibre script.")),
            { once: true },
        );
        document.head.appendChild(script);
    });

    return window.maplibregl;
}

async function ensureMapLibreFromCdn() {
    ensureMapLibreCss();
    return await ensureMapLibreJs();
}

async function ensureMapLibreFromLocal() {
    const [{ default: localMaplibre }] = await Promise.all([
        import("maplibre-gl"),
        import("maplibre-gl/dist/maplibre-gl.css"),
    ]);
    return localMaplibre;
}

export async function ensureMapLibreApi() {
    try {
        return await ensureMapLibreFromCdn();
    } catch (error) {
        console.warn(
            "MapLibre CDN unavailable, falling back to local package.",
            error,
        );
        return await ensureMapLibreFromLocal();
    }
}
