import { calculateF3AZone } from "./geoUtils.js";

export function projectLngLat(map, point) {
    if (!map || !point) {
        return null;
    }

    const projected = map.project([point.lng, point.lat]);
    return {
        x: projected.x,
        y: projected.y,
    };
}

export function projectF3AZoneGeometry(
    map,
    homePosition,
    rotation,
    baseDistance,
    isVisible,
) {
    if (!map || !homePosition || !isVisible) {
        return null;
    }

    const { apex, left, right, leftBase, rightBase } = calculateF3AZone(
        homePosition,
        rotation,
        baseDistance,
    );

    return {
        apex: projectLngLat(map, apex),
        left: projectLngLat(map, left),
        right: projectLngLat(map, right),
        leftBase: projectLngLat(map, leftBase),
        rightBase: projectLngLat(map, rightBase),
    };
}
