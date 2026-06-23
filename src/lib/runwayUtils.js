import {
    destinationPoint,
    distanceMeters,
    getBearingDegrees,
    normalizeAngle,
    normalizeBearing,
} from "./geoUtils.js";

export function buildRunwayFromScreen(map, firstPoint, lastPoint, options = {}) {
    const startLngLat = map.unproject([firstPoint.x, firstPoint.y]);
    const endLngLat = map.unproject([lastPoint.x, lastPoint.y]);
    const start = { lat: startLngLat.lat, lng: startLngLat.lng };
    const end = { lat: endLngLat.lat, lng: endLngLat.lng };
    const centerScreen = {
        x: (firstPoint.x + lastPoint.x) / 2,
        y: (firstPoint.y + lastPoint.y) / 2,
    };
    const centerLngLat = map.unproject([centerScreen.x, centerScreen.y]);
    const bearing = getBearingDegrees(start, end);

    return {
        source: options.source ?? "manual",
        confidence: options.confidence ?? 1,
        score: options.score ?? 1,
        stripWidth: options.stripWidth ?? 18,
        firstPoint,
        lastPoint,
        centerPoint: centerScreen,
        start,
        end,
        center: { lat: centerLngLat.lat, lng: centerLngLat.lng },
        heading: normalizeAngle(bearing),
        lengthM: distanceMeters(start.lat, start.lng, end.lat, end.lng),
    };
}

export function rotateRunway(runway, deltaDeg) {
    if (!runway?.center || !Number.isFinite(runway.lengthM)) {
        return runway;
    }

    const heading = normalizeBearing(runway.heading + deltaDeg);
    const halfLength = runway.lengthM / 2;
    const start = destinationPoint(runway.center, heading + 180, halfLength);
    const end = destinationPoint(runway.center, heading, halfLength);

    return {
        ...runway,
        start,
        end,
        heading: normalizeAngle(heading),
        lengthM: distanceMeters(start.lat, start.lng, end.lat, end.lng),
    };
}

export function projectRunway(map, runway) {
    if (!map || !runway?.start || !runway?.end) {
        return null;
    }

    const first = map.project([runway.start.lng, runway.start.lat]);
    const last = map.project([runway.end.lng, runway.end.lat]);

    return {
        ...runway,
        firstPoint: { x: first.x, y: first.y },
        lastPoint: { x: last.x, y: last.y },
        centerPoint: {
            x: (first.x + last.x) / 2,
            y: (first.y + last.y) / 2,
        },
    };
}
