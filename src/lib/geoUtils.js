/**
 * Pure geographic utility functions — no Svelte dependency.
 */

/**
 * Normalize angle to [-180, 180] range.
 * Use for: relative angles, rotation offsets, heading differences.
 * Example: rotation delta, relative bearing from map bearing
 * normalizeAngle(270) → -90
 * normalizeAngle(-200) → 160
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

/**
 * Normalize bearing to [0, 360] range.
 * Use for: absolute compass bearings, cardinal directions, destinations.
 * Example: azimuth heading, true bearing from one point to another
 * normalizeBearing(-90) → 270
 * normalizeBearing(450) → 90
 */
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

export function calculateF3AZone(homePosition, rotation, baseDistance) {
    const axisBearing = normalizeBearing(Number(rotation) || 0);
    const halfApexAngleDeg = 60;
    const baseDistanceM = Math.max(1, Number(baseDistance) || 150);
    const ARM_DISTANCE_M = 600;
    const armSideLength =
        ARM_DISTANCE_M / Math.cos((Math.PI * halfApexAngleDeg) / 180);
    const baseSideLength =
        baseDistanceM / Math.cos((Math.PI * halfApexAngleDeg) / 180);

    return {
        apex: homePosition,
        left: destinationPoint(
            homePosition,
            axisBearing - halfApexAngleDeg,
            armSideLength,
        ),
        right: destinationPoint(
            homePosition,
            axisBearing + halfApexAngleDeg,
            armSideLength,
        ),
        leftBase: destinationPoint(
            homePosition,
            axisBearing - halfApexAngleDeg,
            baseSideLength,
        ),
        rightBase: destinationPoint(
            homePosition,
            axisBearing + halfApexAngleDeg,
            baseSideLength,
        ),
    };
}

export function getBearingDegrees(from, to) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const toDeg = (rad) => (rad * 180) / Math.PI;
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);
    const deltaLng = toRad(to.lng - from.lng);
    const y = Math.sin(deltaLng) * Math.cos(lat2);
    const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

    return normalizeBearing(toDeg(Math.atan2(y, x)));
}

export function calculateMeasureState(reference, target, mapRotation) {
    const distanceM = distanceMeters(
        reference.lat,
        reference.lng,
        target.lat,
        target.lng,
    );
    const bearing = getBearingDegrees(reference, target);
    const wrappedRelative = normalizeBearing(
        bearing - normalizeBearing(mapRotation),
    );
    const relativeAngle =
        wrappedRelative > 180 ? wrappedRelative - 360 : wrappedRelative;

    return {
        distanceM,
        bearing,
        relativeAngle,
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
