/**
 * BMP capture and export utilities — no Svelte dependency.
 * All map state is passed explicitly as parameters.
 */

export function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export async function prepareMapFrameCapture(map) {
    if (!map) return;

    if (!map.loaded()) {
        await new Promise((resolve) => map.once("load", () => resolve()));
    }

    map.triggerRepaint();
    await nextFrame();
    await nextFrame();

    const gl =
        map.getCanvas().getContext("webgl2") ||
        map.getCanvas().getContext("webgl") ||
        map.getCanvas().getContext("experimental-webgl");

    if (gl && typeof gl.finish === "function") {
        gl.finish();
    }
}

export function hasVisiblePixels(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height).data;
    const pixelCount = width * height;
    const stride = Math.max(1, Math.floor(pixelCount / 3000));

    for (let i = 0; i < pixelCount; i += stride) {
        const p = i * 4;
        const a = imageData[p + 3];
        const r = imageData[p];
        const g = imageData[p + 1];
        const b = imageData[p + 2];
        if (a > 0 && (r > 6 || g > 6 || b > 6)) {
            return true;
        }
    }

    return false;
}

export function drawNorthArrow(ctx, width, height, bearing) {
    const size = Math.min(
        64,
        Math.max(36, Math.round(Math.min(width, height) * 0.12)),
    );
    const padding = 14;
    const cx = padding + size / 2;
    const cy = padding + size / 2;

    ctx.save();

    // Backplate for contrast against any map background.
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#091015";
    ctx.strokeStyle = "#8acf35";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // North direction relative to the map view.
    ctx.translate(cx, cy);
    ctx.rotate((-bearing * Math.PI) / 180);

    // Shaft — kept short to leave room for "N" inside the circle.
    ctx.strokeStyle = "#ecf5e5";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, size * 0.1);
    ctx.lineTo(0, -size * 0.1);
    ctx.stroke();

    // Arrowhead — scaled down so tip stays well within the circle.
    ctx.fillStyle = "#e03030";
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.24);
    ctx.lineTo(size * 0.09, -size * 0.1);
    ctx.lineTo(-size * 0.09, -size * 0.1);
    ctx.closePath();
    ctx.fill();

    // "N" above the arrowhead, still inside the circle (radius = size*0.5).
    ctx.fillStyle = "#d8efb2";
    ctx.font = `700 ${Math.max(8, Math.round(size * 0.18))}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", 0, -size * 0.36);

    ctx.restore();
}

export function drawF3AZone(ctx, geometry, color) {
    if (!geometry) return;
    const { apex, left, right, leftBase, rightBase } = geometry;
    if (!apex || !left || !right || !leftBase || !rightBase) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = "butt";
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;

    // Arms (apex → tip)
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(left.x, left.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();

    // Base
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(leftBase.x, leftBase.y);
    ctx.lineTo(rightBase.x, rightBase.y);
    ctx.stroke();

    ctx.restore();
}

export async function createBmpBlob(map, mapViewport, mapWidth, mapHeight, depth = 16, f3aOverlay = null) {
    if (!mapViewport) {
        throw new Error("Map viewport is not ready.");
    }
    if (!map) {
        throw new Error("Map is not initialized.");
    }

    const hidden = mapViewport.querySelectorAll(".hud-overlay");
    hidden.forEach((el) => {
        el.style.visibility = "hidden";
        el.style.opacity = "0";
    });

    let canvas;
    try {
        canvas = document.createElement("canvas");
        canvas.width = mapWidth;
        canvas.height = mapHeight;
        const captureCtx = canvas.getContext("2d");
        if (!captureCtx) {
            throw new Error("Could not create 2D capture context.");
        }

        let frameCaptured = false;
        for (let attempt = 0; attempt < 6; attempt += 1) {
            await prepareMapFrameCapture(map);

            captureCtx.fillStyle = "#000000";
            captureCtx.fillRect(0, 0, mapWidth, mapHeight);
            captureCtx.drawImage(map.getCanvas(), 0, 0, mapWidth, mapHeight);

            if (hasVisiblePixels(captureCtx, mapWidth, mapHeight)) {
                frameCaptured = true;
                break;
            }

            await new Promise((resolve) => setTimeout(resolve, 120));
        }

        if (!frameCaptured) {
            throw new Error(
                "Map frame capture returned empty pixels. Try zooming or panning once, then export again.",
            );
        }

        drawNorthArrow(captureCtx, mapWidth, mapHeight, map.getBearing());
        if (f3aOverlay) {
            drawF3AZone(captureCtx, f3aOverlay.geometry, f3aOverlay.color);
        }
    } finally {
        hidden.forEach((el) => {
            el.style.visibility = "visible";
            el.style.opacity = "1";
        });
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, mapWidth, mapHeight).data;

    const bytesPerPixel = depth === 16 ? 2 : 3;
    const headerSize = depth === 16 ? 66 : 54;
    const rowPadding = (4 - ((mapWidth * bytesPerPixel) % 4)) % 4;
    const fileSize =
        headerSize + (mapWidth * bytesPerPixel + rowPadding) * mapHeight;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    view.setUint16(0, 0x424d, false);
    view.setUint32(2, fileSize, true);
    view.setUint32(10, headerSize, true);
    view.setUint32(14, 40, true);
    view.setInt32(18, mapWidth, true);
    view.setInt32(22, mapHeight, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, depth, true);
    view.setUint32(30, depth === 16 ? 3 : 0, true);

    if (depth === 16) {
        view.setUint32(54, 0xf800, true);
        view.setUint32(58, 0x07e0, true);
        view.setUint32(62, 0x001f, true);
    }

    let offset = headerSize;
    for (let y = mapHeight - 1; y >= 0; y -= 1) {
        for (let x = 0; x < mapWidth; x += 1) {
            const i = (y * mapWidth + x) * 4;

            if (depth === 16) {
                const r = (imgData[i] >> 3) & 0x1f;
                const g = (imgData[i + 1] >> 2) & 0x3f;
                const b = (imgData[i + 2] >> 3) & 0x1f;
                view.setUint16(offset, (r << 11) | (g << 5) | b, true);
                offset += 2;
            } else {
                view.setUint8(offset++, imgData[i + 2]);
                view.setUint8(offset++, imgData[i + 1]);
                view.setUint8(offset++, imgData[i]);
            }
        }

        for (let pad = 0; pad < rowPadding; pad += 1) {
            view.setUint8(offset++, 0);
        }
    }

    return new Blob([buffer], { type: "image/bmp" });
}
