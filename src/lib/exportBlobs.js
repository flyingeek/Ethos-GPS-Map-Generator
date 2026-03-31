import { toDms } from "./geoUtils.js";

export function getViewportCorners(map) {
    if (!map) return null;

    const rect = map.getCanvas().getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (!width || !height) return null;

    const topLeft = map.unproject([0, 0]);
    const topRight = map.unproject([width, 0]);
    const bottomLeft = map.unproject([0, height]);
    const bottomRight = map.unproject([width, height]);

    return { topLeft, topRight, bottomLeft, bottomRight };
}

function resolveExportCorners(corners, bounds) {
    return {
        topLeft: {
            lat: Number((corners?.topLeft.lat ?? bounds.north).toFixed(8)),
            lon: Number((corners?.topLeft.lng ?? bounds.west).toFixed(8)),
        },
        topRight: {
            lat: Number((corners?.topRight.lat ?? bounds.north).toFixed(8)),
            lon: Number((corners?.topRight.lng ?? bounds.east).toFixed(8)),
        },
        bottomLeft: {
            lat: Number((corners?.bottomLeft.lat ?? bounds.south).toFixed(8)),
            lon: Number((corners?.bottomLeft.lng ?? bounds.west).toFixed(8)),
        },
        bottomRight: {
            lat: Number((corners?.bottomRight.lat ?? bounds.south).toFixed(8)),
            lon: Number((corners?.bottomRight.lng ?? bounds.east).toFixed(8)),
        },
    };
}

export function createJsonBlob({ map, bounds, rotation }) {
    const corners = getViewportCorners(map);
    const payload = {
        ...resolveExportCorners(corners, bounds),
        rotation: Number(rotation.toFixed(1)),
    };

    return new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
    });
}

export function createLuaBlob({
    map,
    bounds,
    rotation,
    zoom,
    mapTitle,
    mapWidth,
    mapHeight,
}) {
    const corners = getViewportCorners(map);
    const { topLeft, topRight, bottomLeft, bottomRight } = resolveExportCorners(
        corners,
        bounds,
    );

    const lua = `return {
  title = "${mapTitle}",
  resolution = { width = ${mapWidth}, height = ${mapHeight} },
    zoom = ${Number(zoom.toFixed(1))},
    rotation = ${Number(rotation.toFixed(1))},
  topLeft = { lat = ${topLeft.lat}, lon = ${topLeft.lon} },
  topRight = { lat = ${topRight.lat}, lon = ${topRight.lon} },
  bottomLeft = { lat = ${bottomLeft.lat}, lon = ${bottomLeft.lon} },
  bottomRight = { lat = ${bottomRight.lat}, lon = ${bottomRight.lon} }
}\n`;

    return new Blob([lua], { type: "text/plain" });
}

export function createMetadataBlob({
    map,
    bounds,
    rotation,
    zoom,
    mapTitle,
    mapWidth,
    mapHeight,
}) {
    const corners = getViewportCorners(map);
    const { topLeft, topRight, bottomLeft, bottomRight } = resolveExportCorners(
        corners,
        bounds,
    );

    const latValues = [
        topLeft.lat,
        topRight.lat,
        bottomLeft.lat,
        bottomRight.lat,
    ];
    const lonValues = [
        topLeft.lon,
        topRight.lon,
        bottomLeft.lon,
        bottomRight.lon,
    ];
    const north = Math.max(...latValues);
    const south = Math.min(...latValues);
    const west = Math.min(...lonValues);
    const east = Math.max(...lonValues);

    const lines = [
        `MAP METADATA: ${mapTitle}`,
        `Generated: ${new Date().toLocaleString()}`,
        `Resolution: ${mapWidth} x ${mapHeight} pixels`,
        `Rotation: ${rotation.toFixed(1)} degrees`,
        "",
        "CORNERS (Decimal)",
        "-----------------",
        `Top Left:     lat ${topLeft.lat.toFixed(8)}, lon ${topLeft.lon.toFixed(8)}`,
        `Top Right:    lat ${topRight.lat.toFixed(8)}, lon ${topRight.lon.toFixed(8)}`,
        `Bottom Left:  lat ${bottomLeft.lat.toFixed(8)}, lon ${bottomLeft.lon.toFixed(8)}`,
        `Bottom Right: lat ${bottomRight.lat.toFixed(8)}, lon ${bottomRight.lon.toFixed(8)}`,
        "",
        "CORNERS (DMS)",
        "-------------",
        `Top Left:     ${toDms(topLeft.lat, true)} | ${toDms(topLeft.lon, false)}`,
        `Top Right:    ${toDms(topRight.lat, true)} | ${toDms(topRight.lon, false)}`,
        `Bottom Left:  ${toDms(bottomLeft.lat, true)} | ${toDms(bottomLeft.lon, false)}`,
        `Bottom Right: ${toDms(bottomRight.lat, true)} | ${toDms(bottomRight.lon, false)}`,
        "",
        "EXTENTS (Derived from corners)",
        "------------------------------",
        `N: ${north.toFixed(8)} | S: ${south.toFixed(8)}`,
        `W: ${west.toFixed(8)} | E: ${east.toFixed(8)}`,
        `Zoom Level: ${zoom.toFixed(1)}`,
    ];

    return new Blob([lines.join("\n")], { type: "text/plain" });
}
