import { createBmpBlob } from "./bmpExport.js";
import { createJsonBlob, createLuaBlob, createMetadataBlob } from "./exportBlobs.js";

export function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Build all export files once so callers (ZIP / SD sync) can share the same flow.
 */
export async function createExportArtifacts({
    map,
    mapViewport,
    mapWidth,
    mapHeight,
    bounds,
    rotation,
    zoom,
    baseName,
    homePosition,
}) {
    const bmpBlob = await createBmpBlob(map, mapViewport, mapWidth, mapHeight, 16);
    const jsonBlob = createJsonBlob({ map, bounds, rotation });
    const luaBlob = createLuaBlob({
        map,
        bounds,
        rotation,
        zoom,
        mapTitle: baseName,
        mapWidth,
        mapHeight,
        homePosition,
    });
    const metaBlob = createMetadataBlob({
        map,
        bounds,
        rotation,
        zoom,
        mapTitle: baseName,
        mapWidth,
        mapHeight,
    });

    return { bmpBlob, jsonBlob, luaBlob, metaBlob };
}
