<script>
    import { onMount } from "svelte";
    import JSZip from "jszip";
    import maplibregl from "maplibre-gl";
    import { buildRasterStyle, MAP_TYPES } from "./mapStyles.js";
    import { normalizeAngle, distanceMeters } from "./lib/geoUtils.js";
    import {
        createExportArtifacts,
        downloadFile,
    } from "./lib/exportActions.js";
    import ProjectShelf from "./components/ProjectShelf.svelte";
    import SearchPanel from "./components/SearchPanel.svelte";
    import "maplibre-gl/dist/maplibre-gl.css";

    let map;
    let mapContainer;
    let mapViewport;

    let mapTitle = "EthosMap";
    let resolution = "800,480";
    let customW = 800;
    let customH = 480;
    let mapType = "y";
    let zoomLock = false;
    let rotation = 0;

    let sdHandle = null;
    let isSdLinked = false;
    let syncMessage = "Sync To SD";

    let bounds = { north: 0, south: 0, west: 0, east: 0 };
    let center = { lat: 42.6977, lng: 23.3219 };
    let zoom = 12;

    let isMeasureActive = false;
    let measureStart = null;
    let measureDistanceM = 0;

    $: mapWidth =
        resolution === "custom"
            ? Number(customW) || 800
            : Number(resolution.split(",")[0]);
    $: mapHeight =
        resolution === "custom"
            ? Number(customH) || 480
            : Number(resolution.split(",")[1]);

    $: if (mapViewport) {
        mapViewport.style.width = `${mapWidth}px`;
        mapViewport.style.height = `${mapHeight}px`;
        if (map) {
            queueMicrotask(() => map.resize());
        }
    }

    $: if (map) {
        const state = {
            center: map.getCenter(),
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch(),
        };
        map.setStyle(buildRasterStyle(mapType));
        map.once("styledata", () => {
            map.jumpTo(state);
            refreshBounds();
        });
    }

    $: if (map) {
        map.setBearing(rotation);
    }

    $: if (map) {
        if (zoomLock) {
            map.scrollZoom.disable();
            map.doubleClickZoom.disable();
            map.touchZoomRotate.disableRotation();
            map.touchZoomRotate.disable();
            map.keyboard.disable();
        } else {
            map.scrollZoom.enable();
            map.doubleClickZoom.enable();
            map.touchZoomRotate.enableRotation();
            map.touchZoomRotate.enable();
            map.keyboard.enable();
        }
    }

    const measuringFeatureId = "measure-line";

    onMount(() => {
        map = new maplibregl.Map({
            container: mapContainer,
            style: buildRasterStyle(mapType),
            center: [center.lng, center.lat],
            zoom,
            bearing: rotation,
            preserveDrawingBuffer: true,
            attributionControl: false,
        });

        map.addControl(
            new maplibregl.NavigationControl({
                showCompass: true,
                visualizePitch: false,
            }),
            "top-left",
        );
        map.addControl(
            new maplibregl.ScaleControl({ unit: "metric", maxWidth: 120 }),
            "bottom-right",
        );

        map.on("load", () => {
            refreshBounds();
            refreshCenterAndZoom();
        });

        map.on("move", () => {
            refreshCenterAndZoom();
            refreshBounds();
            if (isMeasureActive) {
                updateMeasureLine();
            }
        });

        map.on("zoom", () => {
            refreshCenterAndZoom();
            refreshBounds();
        });

        map.on("rotate", () => {
            rotation = Number(map.getBearing().toFixed(1));
        });

        map.on("contextmenu", () => {
            if (isMeasureActive) {
                toggleMeasure();
            }
        });

        const watchdog = setInterval(async () => {
            if (!sdHandle) {
                isSdLinked = false;
                return;
            }
            try {
                const iterator = sdHandle.entries();
                await iterator.next();
            } catch (error) {
                sdHandle = null;
                isSdLinked = false;
            }
        }, 1800);

        return () => {
            clearInterval(watchdog);
            if (map) {
                map.remove();
            }
        };
    });

    function refreshBounds() {
        if (!map) return;
        const b = map.getBounds();
        bounds = {
            north: b.getNorth(),
            south: b.getSouth(),
            west: b.getWest(),
            east: b.getEast(),
        };
    }

    function refreshCenterAndZoom() {
        if (!map) return;
        const c = map.getCenter();
        center = { lat: c.lat, lng: c.lng };
        zoom = Number(map.getZoom().toFixed(1));
    }

    function rotateStep(step) {
        rotation = normalizeAngle(rotation + step);
        if (map) {
            map.easeTo({ bearing: rotation, duration: 250 });
        }
    }

    function resetRotation() {
        rotation = 0;
        if (map) {
            map.easeTo({ bearing: 0, duration: 260 });
        }
    }

    function handleRotationWheel(event) {
        const step = event.deltaY < 0 ? 0.1 : -0.1;
        rotation = normalizeAngle(rotation + step);
    }

    function toggleMeasure() {
        if (!map) return;

        if (!isMeasureActive) {
            isMeasureActive = true;
            measureStart = map.getCenter();
            measureDistanceM = 0;
            ensureMeasureSource();
            updateMeasureLine();
            return;
        }

        isMeasureActive = false;
        measureStart = null;
        measureDistanceM = 0;

        if (map.getLayer(measuringFeatureId)) {
            map.removeLayer(measuringFeatureId);
        }
        if (map.getSource(measuringFeatureId)) {
            map.removeSource(measuringFeatureId);
        }
    }

    function ensureMeasureSource() {
        if (!map.getSource(measuringFeatureId)) {
            map.addSource(measuringFeatureId, {
                type: "geojson",
                data: {
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: [],
                    },
                },
            });
        }

        if (!map.getLayer(measuringFeatureId)) {
            map.addLayer({
                id: measuringFeatureId,
                type: "line",
                source: measuringFeatureId,
                paint: {
                    "line-color": "#89dc33",
                    "line-width": 3,
                    "line-dasharray": [2, 1.5],
                },
            });
        }
    }

    function updateMeasureLine() {
        if (!map || !measureStart || !map.getSource(measuringFeatureId)) return;

        const mapCenter = map.getCenter();
        measureDistanceM = distanceMeters(
            measureStart.lat,
            measureStart.lng,
            mapCenter.lat,
            mapCenter.lng,
        );

        const source = map.getSource(measuringFeatureId);
        source.setData({
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: [
                    [measureStart.lng, measureStart.lat],
                    [mapCenter.lng, mapCenter.lat],
                ],
            },
        });
    }

    function cleanBaseName() {
        return (mapTitle.trim() || "EthosMap")
            .replace(/[^a-zA-Z0-9]/g, "_")
            .slice(0, 24);
    }

    async function handleDownloadZip() {
        const baseName = cleanBaseName();
        const { bmpBlob, jsonBlob, luaBlob, metaBlob } =
            await createExportArtifacts({
                map,
                mapViewport,
                mapWidth,
                mapHeight,
                bounds,
                rotation,
                zoom,
                baseName,
            });

        const zip = new JSZip();
        zip.file(`${baseName}.bmp`, bmpBlob);
        zip.file(`${baseName}.json`, jsonBlob);
        zip.file(`${baseName}.lua`, luaBlob);
        zip.file(`${baseName}_metadata.txt`, metaBlob);

        const outBlob = await zip.generateAsync({ type: "blob" });
        downloadFile(outBlob, `${baseName}.zip`);
    }

    async function linkSdCard() {
        try {
            sdHandle = await window.showDirectoryPicker();
            isSdLinked = true;
        } catch (error) {
            isSdLinked = false;
        }
    }

    async function saveToSd(blob, folderPath, fileName) {
        if (!sdHandle) return false;

        try {
            let currentHandle = sdHandle;
            const folders = folderPath.split("/").filter(Boolean);
            for (const folder of folders) {
                currentHandle = await currentHandle.getDirectoryHandle(folder, {
                    create: true,
                });
            }

            const fileHandle = await currentHandle.getFileHandle(fileName, {
                create: true,
            });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            return true;
        } catch (error) {
            return false;
        }
    }

    async function handleSync() {
        if (!sdHandle) {
            await linkSdCard();
        }

        if (!sdHandle) {
            return;
        }

        const baseName = cleanBaseName();

        syncMessage = "Syncing...";
        const { bmpBlob, jsonBlob, luaBlob, metaBlob } =
            await createExportArtifacts({
                map,
                mapViewport,
                mapWidth,
                mapHeight,
                bounds,
                rotation,
                zoom,
                baseName,
            });

        const bmpOk = await saveToSd(bmpBlob, "bitmaps/GPS", `${baseName}.bmp`);
        const jsonOk = await saveToSd(
            jsonBlob,
            "documents/user",
            `${baseName}.json`,
        );
        const luaOk = await saveToSd(
            luaBlob,
            "documents/user",
            `${baseName}.lua`,
        );
        const metaOk = await saveToSd(
            metaBlob,
            "documents/user",
            `${baseName}_metadata.txt`,
        );

        syncMessage =
            bmpOk && jsonOk && luaOk && metaOk ? "Synced!" : "Sync Failed";

        setTimeout(() => {
            syncMessage = "Sync To SD";
        }, 1800);
    }
    function handleLoadProject(event) {
        const p = event.detail?.project;
        if (!p) return;

        mapTitle = p.mapTitle ?? p.name;
        resolution = p.resolution;
        customW = p.customW;
        customH = p.customH;
        mapType = p.mapType;
        zoomLock = p.zoomLock;
        rotation = p.rotation;

        if (map) {
            map.jumpTo({
                center: [p.center.lng, p.center.lat],
                zoom: p.zoom,
                bearing: p.rotation,
            });
        } else {
            center = { lat: p.center.lat, lng: p.center.lng };
            zoom = p.zoom;
        }
    }
</script>

<svelte:head>
    <title>Ethos GPS Map Generator - Svelte</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossorigin="anonymous"
    />
    <link
        href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<div class="page-shell">
    <header class="header">
        <img src="/ethos logo.png" alt="Ethos" class="logo" />
        <div>
            <h1>Ethos GPS Map Generator</h1>
            <p>Svelte Edition with rotation-aware exports</p>
        </div>

        <ProjectShelf
            projectState={{
                mapTitle,
                resolution,
                customW,
                customH,
                mapType,
                zoomLock,
                rotation,
                center,
                zoom,
            }}
            on:loadproject={handleLoadProject}
        />
    </header>

    <section class="panel controls">
        <div class="row">
            <label class="field">
                <span>Project Title</span>
                <input type="text" bind:value={mapTitle} maxlength="24" />
            </label>

            <label class="field">
                <span>Resolution</span>
                <select bind:value={resolution}>
                    <option value="800,480">X20/X18 (800x480)</option>
                    <option value="784,316">X20/X18 (784x316)</option>
                    <option value="480,320">X18 (480x320)</option>
                    <option value="custom">Custom</option>
                </select>
            </label>

            {#if resolution === "custom"}
                <label class="field mini">
                    <span>Width</span>
                    <input
                        type="number"
                        bind:value={customW}
                        min="150"
                        step="1"
                    />
                </label>

                <label class="field mini">
                    <span>Height</span>
                    <input
                        type="number"
                        bind:value={customH}
                        min="120"
                        step="1"
                    />
                </label>
            {/if}

            <label class="field">
                <span>Map Type</span>
                <select bind:value={mapType}>
                    {#each Object.entries(MAP_TYPES) as [value, label]}
                        <option {value}>{label}</option>
                    {/each}
                </select>
            </label>

            <label class="lock-field">
                <input type="checkbox" bind:checked={zoomLock} />
                <span>Zoom Lock</span>
            </label>
        </div>

        <div class="row rotate-row">
            <div class="rotate-controls">
                <span class="rotate-label">Rotation</span>
                <button type="button" on:click={() => rotateStep(-15)}
                    >⟳ -15°</button
                >
                <input
                    type="range"
                    min="-180"
                    max="180"
                    step="0.1"
                    bind:value={rotation}
                />
                <button type="button" on:click={() => rotateStep(15)}
                    >+15° ⟲</button
                >
                <button type="button" class="ghost" on:click={resetRotation}
                    >Reset</button
                >
                <span
                    class="bearing"
                    title="Scroll to adjust by 0.1°"
                    on:wheel|preventDefault={handleRotationWheel}
                    >{rotation.toFixed(1)}°</span
                >
                <span
                    class="wheel-hint"
                    aria-hidden="true"
                    title="Use mouse wheel here">🖱️</span
                >
            </div>

            <div class="action-controls">
                <button class="warn" on:click={linkSdCard}
                    >{isSdLinked ? "SD Linked" : "Link SD Card"}</button
                >
                <button class="ok" on:click={handleSync}>{syncMessage}</button>
                <button class="ghost" on:click={handleDownloadZip}
                    >Download ZIP</button
                >
            </div>
        </div>

        <div class="bounds-grid">
            <div>
                <h3>Latitude Bounds</h3>
                <p>
                    N: {bounds.north.toFixed(8)} | S: {bounds.south.toFixed(8)}
                </p>
            </div>
            <div>
                <h3>Longitude Bounds</h3>
                <p>W: {bounds.west.toFixed(8)} | E: {bounds.east.toFixed(8)}</p>
            </div>
        </div>
    </section>

    <section class="workspace">
        <div class="map-column">
            <div
                class="map-box"
                bind:this={mapViewport}
                style={`width:${mapWidth}px;height:${mapHeight}px;`}
            >
                <div class="map-surface" bind:this={mapContainer}></div>
                <div class="crosshair hud-overlay"></div>
                <div class="zoom-badge hud-overlay">
                    Zoom: {zoom.toFixed(1)}
                </div>
                <button
                    class={`measure-btn hud-overlay ${isMeasureActive ? "active" : ""}`}
                    on:click={toggleMeasure}
                >
                    {isMeasureActive ? "Stop Measure" : "Measure"}
                </button>
                <div class="coords hud-overlay">
                    {#if isMeasureActive}
                        📏 {measureDistanceM.toFixed(1)}m / {(
                            measureDistanceM * 3.28084
                        ).toFixed(0)}ft |
                    {/if}
                    Lat: {center.lat.toFixed(6)}, Lng: {center.lng.toFixed(6)}
                </div>
            </div>

            <SearchPanel {map} {mapWidth} />
        </div>

        <aside class="panel guide">
            <h2>Export Notes</h2>
            <p>
                Sync writes the BMP to bitmaps/GPS and JSON plus metadata to
                documents/user.
            </p>
            <p>
                ZIP export includes the same three files and now stores rotation
                in JSON and metadata.
            </p>
            <p>Right-click the map to exit measure mode quickly.</p>
        </aside>
    </section>
</div>

<style>
    .page-shell {
        width: min(1220px, 96vw);
        margin: 0 auto;
        padding: 14px 0 28px;
        display: grid;
        gap: 12px;
    }

    .header {
        display: flex;
        align-items: center;
        gap: 14px;
        color: #93cf2f;
        flex-wrap: wrap;
        justify-content: space-between;
    }

    .logo {
        width: 86px;
        height: auto;
        object-fit: contain;
    }

    .header h1 {
        margin: 0;
        font-size: clamp(1.3rem, 2.1vw, 2rem);
        line-height: 1;
        letter-spacing: 0.03em;
    }

    .header p {
        margin: 0.15rem 0 0;
        color: #adbbc2;
        font-family: "Space Mono", monospace;
        font-size: 0.8rem;
    }

    .panel {
        background: linear-gradient(
            165deg,
            rgba(18, 28, 31, 0.92),
            rgba(8, 14, 18, 0.95)
        );
        border: 1px solid rgba(133, 184, 55, 0.36);
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 14px 40px rgba(0, 0, 0, 0.4);
    }

    .controls {
        display: grid;
        gap: 10px;
    }

    .row {
        display: flex;
        align-items: end;
        flex-wrap: wrap;
        gap: 10px;
    }

    .field {
        display: grid;
        gap: 4px;
        min-width: 170px;
    }

    .field.mini {
        min-width: 90px;
    }

    .field span,
    .rotate-label {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #8da0ab;
        font-size: 0.7rem;
        font-weight: 700;
    }

    input,
    select,
    button {
        border: 1px solid #2f4b51;
        background: #0c171b;
        color: #eff6f2;
        border-radius: 7px;
        padding: 8px 10px;
        font: inherit;
        min-height: 38px;
    }

    button {
        cursor: pointer;
        font-weight: 700;
    }

    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    button.ok {
        background: linear-gradient(135deg, #7fb729, #4a8f26);
        border-color: #90db35;
        color: #092409;
    }

    button.warn {
        background: linear-gradient(135deg, #d78931, #bc5f18);
        border-color: #f5a454;
        color: #fff9f0;
    }

    button.ghost {
        background: transparent;
        border-color: #4a666f;
    }

    .lock-field {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(11, 20, 24, 0.95);
        border: 1px solid #3a5057;
        padding: 8px 11px;
        border-radius: 7px;
        min-height: 38px;
        font-weight: 700;
    }

    .lock-field input {
        min-height: unset;
        width: 16px;
        height: 16px;
        margin: 0;
    }

    .rotate-row {
        justify-content: space-between;
        align-items: center;
        gap: 12px;
    }

    .rotate-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .rotate-controls input[type="range"] {
        width: 280px;
        padding: 0;
    }

    .bearing {
        min-width: 52px;
        text-align: right;
        font-family: "Space Mono", monospace;
        color: #9de44d;
    }

    .wheel-hint {
        font-size: 0.9rem;
        opacity: 0.75;
        user-select: none;
        filter: drop-shadow(0 0 4px rgba(157, 228, 77, 0.35));
    }

    .action-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .bounds-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(220px, 1fr));
        gap: 8px;
        background: rgba(4, 9, 12, 0.6);
        border: 1px solid #304750;
        border-radius: 8px;
        padding: 10px;
        font-family: "Space Mono", monospace;
    }

    .bounds-grid h3 {
        margin: 0;
        font-size: 0.74rem;
        color: #96adbc;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .bounds-grid p {
        margin: 6px 0 0;
        color: #88de31;
        font-size: 0.82rem;
    }

    .workspace {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        flex-wrap: wrap;
    }

    .map-column {
        display: grid;
        gap: 10px;
    }

    .map-box {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        border: 4px solid rgba(72, 119, 43, 0.75);
        box-shadow: 0 0 24px rgba(137, 220, 51, 0.22);
        background: #000;
        flex-shrink: 0;
    }

    .map-surface {
        width: 100%;
        height: 100%;
    }

    .crosshair {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 40px;
        height: 40px;
        transform: translate(-50%, -50%);
        opacity: 0.75;
        pointer-events: none;
    }

    .crosshair::before,
    .crosshair::after {
        content: "";
        position: absolute;
        background: #95ef37;
        box-shadow: 0 0 8px rgba(149, 239, 55, 0.65);
    }

    .crosshair::before {
        left: 0;
        top: 19px;
        width: 40px;
        height: 2px;
    }

    .crosshair::after {
        left: 19px;
        top: 0;
        width: 2px;
        height: 40px;
    }

    .zoom-badge,
    .measure-btn,
    .coords {
        position: absolute;
        right: 10px;
        color: #b8f971;
        background: rgba(4, 8, 10, 0.8);
        border: 2px solid #8acf35;
        border-radius: 7px;
        font-family: "Space Mono", monospace;
        font-weight: 700;
        font-size: 0.74rem;
        text-shadow: 1px 1px #000;
        backdrop-filter: blur(2px);
    }

    .zoom-badge {
        top: 10px;
        padding: 5px 9px;
    }

    .measure-btn {
        top: 46px;
        padding: 5px 9px;
        cursor: pointer;
    }

    .measure-btn.active {
        color: #0b2105;
        background: #8ad52f;
    }

    .coords {
        bottom: 12px;
        max-width: calc(100% - 156px);
        left: 10px;
        right: auto;
        padding: 5px 8px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .guide {
        width: min(310px, 96vw);
        display: grid;
        gap: 8px;
    }

    .guide h2 {
        margin: 0;
        color: #96d547;
        font-size: 1rem;
    }

    .guide p {
        margin: 0;
        color: #cad4d9;
        font-size: 0.9rem;
    }

    @media (max-width: 1024px) {
        .page-shell {
            width: 96vw;
        }

        .workspace {
            flex-direction: column;
        }

        .map-box {
            width: min(96vw, var(--mobile-map-width));
            max-width: 100%;
            height: auto;
            aspect-ratio: 5 / 3;
        }

        .search-field {
            min-width: 100%;
        }

        .map-surface {
            position: absolute;
            inset: 0;
        }
    }

    :global(.maplibregl-ctrl-bottom-right .maplibregl-ctrl-scale) {
        background: rgba(4, 8, 10, 0.8);
        border: 2px solid #8acf35;
        color: #fff;
        border-top: none;
        font-family: "Space Mono", monospace;
        font-weight: 700;
    }
</style>
