/**
 * Pure geographic utility functions — no Svelte dependency.
 */

export function normalizeAngle(value) {
    let out = value;
    while (out > 180) out -= 360;
    while (out < -180) out += 360;
    return Number(out.toFixed(1));
}

export function distanceMeters(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const r = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return r * c;
}

export function normalizeBearing(value) {
    return ((value % 360) + 360) % 360;
}

export function destinationPoint(origin, bearingDeg, distanceM) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const toDeg = (rad) => (rad * 180) / Math.PI;
    const earthRadiusM = 6371000;
    const angularDistance = distanceM / earthRadiusM;
    const bearing = toRad(bearingDeg);
    const lat1 = toRad(origin.lat);
    const lon1 = toRad(origin.lng);

    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(angularDistance) +
            Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const lon2 =
        lon1 +
        Math.atan2(
            Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
            Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
        );

    return {
        lat: toDeg(lat2),
        lng: ((toDeg(lon2) + 540) % 360) - 180,
    };
}

export function toDms(decimal, isLat) {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = ((minutesFloat - minutes) * 60).toFixed(1);
    const direction = isLat
        ? decimal >= 0
            ? "N"
            : "S"
        : decimal >= 0
          ? "E"
          : "W";
    return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}
