<script>
    import { onMount } from "svelte";
    import { buildRasterStyle, MAP_TYPES } from "./mapStyles.js";
    import { normalizeAngle, distanceMeters } from "./lib/geoUtils.js";
    import {
        createExportArtifacts,
        downloadFile,
    } from "./lib/exportActions.js";
    import ProjectShelf from "./components/ProjectShelf.svelte";
    import SearchPanel from "./components/SearchPanel.svelte";

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
    let homePosition = null;
    let homeScreenPoint = null;
    let isF3AZoneVisible = false;
    let f3aRotation = 0;
    let f3aZoneGeometry = null;

    $: hudReference = homePosition ?? center;

    $: mapWidth =
        resolution === "custom"
            ? Number(customW) || 800
            : Number(resolution.split(",")[0]);
    $: mapHeight =
        resolution === "custom"
            ? Number(customH) || 480
            : Number(resolution.split(",")[1]);

    $: crosshairStyle = homeScreenPoint
        ? `left:${homeScreenPoint.x}px;top:${homeScreenPoint.y}px;`
        : "";

    $: if (map) {
        homePosition;
        isF3AZoneVisible;
        f3aRotation;
        updateHomeCrosshairScreenPoint();
        updateF3AZoneOverlay();
    }

    $: if (mapViewport) {
        mapViewport.style.width = `${mapWidth}px`;
        mapViewport.style.height = `${mapHeight}px`;
        if (map) {
            queueMicrotask(() => {
                map.resize();
                updateHomeCrosshairScreenPoint();
                updateF3AZoneOverlay();
            });
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
            updateHomeCrosshairScreenPoint();
            updateF3AZoneOverlay();
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

    const MAPLIBRE_VERSION = "5.1.1";
    const MAPLIBRE_CSS_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
    const MAPLIBRE_JS_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;

    let maplibreglApi = null;

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
        maplibreglApi = await ensureMapLibreJs();
    }

    async function ensureMapLibreFromLocal() {
        const [{ default: localMaplibre }] = await Promise.all([
            import("maplibre-gl"),
            import("maplibre-gl/dist/maplibre-gl.css"),
        ]);
        maplibreglApi = localMaplibre;
    }

    async function ensureMapLibreApi() {
        try {
            await ensureMapLibreFromCdn();
        } catch (error) {
            console.warn(
                "MapLibre CDN unavailable, falling back to local package.",
                error,
            );
            await ensureMapLibreFromLocal();
        }
    }

    onMount(() => {
        let cancelled = false;
        let watchdog;

        const init = async () => {
            try {
                await ensureMapLibreApi();
                if (cancelled || !maplibreglApi) return;

                map = new maplibreglApi.Map({
                    container: mapContainer,
                    style: buildRasterStyle(mapType),
                    center: [center.lng, center.lat],
                    zoom,
                    bearing: rotation,
                    preserveDrawingBuffer: true,
                    attributionControl: false,
                });

                map.addControl(
                    new maplibreglApi.NavigationControl({
                        showCompass: true,
                        visualizePitch: false,
                    }),
                    "top-left",
                );
                map.addControl(
                    new maplibreglApi.ScaleControl({
                        unit: "metric",
                        maxWidth: 120,
                    }),
                    "bottom-right",
                );

                map.on("load", () => {
                    refreshBounds();
                    refreshCenterAndZoom();
                    updateHomeCrosshairScreenPoint();
                    updateF3AZoneOverlay();
                });

                map.on("move", () => {
                    refreshCenterAndZoom();
                    refreshBounds();
                    updateHomeCrosshairScreenPoint();
                    updateF3AZoneOverlay();
                    if (isMeasureActive) {
                        updateMeasureLine();
                    }
                });

                map.on("zoom", () => {
                    refreshCenterAndZoom();
                    refreshBounds();
                    updateHomeCrosshairScreenPoint();
                    updateF3AZoneOverlay();
                });

                map.on("rotate", () => {
                    rotation = Number(map.getBearing().toFixed(1));
                    updateHomeCrosshairScreenPoint();
                    updateF3AZoneOverlay();
                });

                map.on("contextmenu", () => {
                    if (isMeasureActive) {
                        toggleMeasure();
                    }
                });
            } catch (error) {
                console.error("MapLibre initialization failed:", error);
            }
        };

        init();

        watchdog = setInterval(async () => {
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
            cancelled = true;
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

    function handleF3ARotationWheel(event) {
        const step = event.deltaY < 0 ? 0.1 : -0.1;
        f3aRotation = normalizeAngle(f3aRotation + step);
        updateF3AZoneOverlay();
    }

    function toggleMeasure() {
        if (!map) return;

        if (!isMeasureActive) {
            isMeasureActive = true;
            measureStart = homePosition ?? map.getCenter();
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
        if (
            !map ||
            (!homePosition && !measureStart) ||
            !map.getSource(measuringFeatureId)
        ) {
            return;
        }

        const mapCenter = map.getCenter();
        const reference = homePosition ?? measureStart;
        measureDistanceM = distanceMeters(
            reference.lat,
            reference.lng,
            mapCenter.lat,
            mapCenter.lng,
        );

        const source = map.getSource(measuringFeatureId);
        source.setData({
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: [
                    [reference.lng, reference.lat],
                    [mapCenter.lng, mapCenter.lat],
                ],
            },
        });
    }

    function updateHomeCrosshairScreenPoint() {
        if (!map || !homePosition) {
            homeScreenPoint = null;
            return;
        }

        const projected = map.project([homePosition.lng, homePosition.lat]);
        homeScreenPoint = {
            x: projected.x,
            y: projected.y,
        };
    }

    function normalizeBearing(value) {
        return ((value % 360) + 360) % 360;
    }

    function destinationPoint(origin, bearingDeg, distanceM) {
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

    function snapScreenPoint(point) {
        return {
            x: Math.round(point.x * 2) / 2,
            y: Math.round(point.y * 2) / 2,
        };
    }

    function updateF3AZoneOverlay() {
        if (!map || !homePosition || !isF3AZoneVisible) {
            f3aZoneGeometry = null;
            return;
        }

        const axisBearing = normalizeBearing(f3aRotation);
        const sideLength = 150 / Math.cos(Math.PI / 6);
        const leftPoint = destinationPoint(
            homePosition,
            axisBearing - 30,
            sideLength,
        );
        const rightPoint = destinationPoint(
            homePosition,
            axisBearing + 30,
            sideLength,
        );

        const apexScreen = snapScreenPoint(
            homeScreenPoint ??
                map.project([homePosition.lng, homePosition.lat]),
        );
        const leftScreen = snapScreenPoint(
            map.project([leftPoint.lng, leftPoint.lat]),
        );
        const rightScreen = snapScreenPoint(
            map.project([rightPoint.lng, rightPoint.lat]),
        );

        console.log("F3A apex/crosshair debug", {
            apex: { x: apexScreen.x, y: apexScreen.y },
            crosshair: homeScreenPoint
                ? { x: homeScreenPoint.x, y: homeScreenPoint.y }
                : null,
        });

        f3aZoneGeometry = {
            apex: apexScreen,
            left: leftScreen,
            right: rightScreen,
        };
    }

    function setHomePosition() {
        if (!map) return;
        const c = map.getCenter();
        homePosition = { lat: c.lat, lng: c.lng };
        updateHomeCrosshairScreenPoint();
        if (isMeasureActive) {
            measureStart = homePosition;
            updateMeasureLine();
        }
    }

    function clearHomePosition() {
        homePosition = null;
        homeScreenPoint = null;
        if (isMeasureActive) {
            measureStart = map?.getCenter() ?? null;
            updateMeasureLine();
        }
        updateF3AZoneOverlay();
    }

    function toggleF3AZone() {
        if (!isF3AZoneVisible && map) {
            f3aRotation = Number(map.getBearing().toFixed(1));
        }
        isF3AZoneVisible = !isF3AZoneVisible;
        updateF3AZoneOverlay();
    }

    function resetF3ARotation() {
        f3aRotation = map ? Number(map.getBearing().toFixed(1)) : 0;
        updateF3AZoneOverlay();
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
                homePosition,
            });

        const { default: JSZip } = await import("jszip");
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
                homePosition,
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
        homePosition = p.homePosition ?? null;

        if (map) {
            map.jumpTo({
                center: [p.center.lng, p.center.lat],
                zoom: p.zoom,
                bearing: p.rotation,
            });
            updateHomeCrosshairScreenPoint();
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
                homePosition,
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
                {#if f3aZoneGeometry}
                    <svg
                        class="zone-overlay hud-overlay"
                        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                        preserveAspectRatio="none"
                    >
                        <line
                            class="f3a-triangle"
                            x1={f3aZoneGeometry.apex.x}
                            y1={f3aZoneGeometry.apex.y}
                            x2={f3aZoneGeometry.left.x}
                            y2={f3aZoneGeometry.left.y}
                        ></line>
                        <line
                            class="f3a-triangle"
                            x1={f3aZoneGeometry.apex.x}
                            y1={f3aZoneGeometry.apex.y}
                            x2={f3aZoneGeometry.right.x}
                            y2={f3aZoneGeometry.right.y}
                        ></line>
                        <line
                            class="f3a-triangle"
                            x1={f3aZoneGeometry.left.x}
                            y1={f3aZoneGeometry.left.y}
                            x2={f3aZoneGeometry.right.x}
                            y2={f3aZoneGeometry.right.y}
                        ></line>
                    </svg>
                {/if}
                <div
                    class={`crosshair hud-overlay ${homePosition ? "home-locked" : ""}`}
                    style={crosshairStyle}
                ></div>
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
                    {#if homePosition}
                        <span
                            class="coords-lock"
                            title="Home position is locked">🔒</span
                        >
                    {/if}
                    Lat: {hudReference.lat.toFixed(6)}, Lng: {hudReference.lng.toFixed(
                        6,
                    )}
                </div>
            </div>

            <SearchPanel {map} {mapWidth} />
        </div>

        <aside class="panel guide">
            <section class="home-panel">
                <h2>Home Position</h2>
                <p>
                    Lock the crosshair to the current center and keep it pinned
                    while moving the map.
                </p>
                <div class="home-actions">
                    <button class="ok" on:click={setHomePosition}
                        >Set Home Position</button
                    >
                    <button
                        class="ghost"
                        on:click={clearHomePosition}
                        disabled={!homePosition}>Clear Home</button
                    >
                </div>
                <p class="home-coords">
                    {#if homePosition}
                        🔒 {homePosition.lat.toFixed(6)}, {homePosition.lng.toFixed(
                            6,
                        )}
                    {:else}
                        Not set
                    {/if}
                </p>
            </section>

            <section class="f3a-panel">
                <h2>F3A Zone</h2>
                <p>
                    Draw a yellow 60° triangle from the locked home position
                    with the base centered 150m away.
                </p>
                <div class="home-actions">
                    <button
                        class={isF3AZoneVisible ? "warn" : "ok"}
                        on:click={toggleF3AZone}
                        disabled={!homePosition}
                        >{isF3AZoneVisible ? "Hide Zone" : "Show Zone"}</button
                    >
                    <button
                        class="ghost"
                        on:click={resetF3ARotation}
                        disabled={!homePosition}>Reset</button
                    >
                    >
                </div>
                <label class="field zone-field">
                    <span>Rotation</span>
                    <input
                        type="range"
                        min="-180"
                        max="180"
                        step="0.1"
                        bind:value={f3aRotation}
                        disabled={!homePosition || !isF3AZoneVisible}
                    />
                </label>
                <div class="zone-rotation-readout">
                    <span
                        class="bearing"
                        title="Scroll to adjust by 0.1°"
                        on:wheel|preventDefault={handleF3ARotationWheel}
                        >{Number(f3aRotation).toFixed(1)}°</span
                    >
                    <span
                        class="wheel-hint"
                        aria-hidden="true"
                        title="Use mouse wheel here">🖱️</span
                    >
                </div>
                <p class="home-coords">
                    {#if homePosition}
                        Base up by default | Rotation {Number(
                            f3aRotation,
                        ).toFixed(1)}°
                    {:else}
                        Set Home Position first
                    {/if}
                </p>
            </section>

            <section>
                <h2>Export Notes</h2>
                <p>
                    Sync writes the BMP to bitmaps/GPS and JSON plus metadata to
                    documents/user.
                </p>
                <p>
                    ZIP export includes the same three files and now stores
                    rotation in JSON and metadata.
                </p>
                <p>Right-click the map to exit measure mode quickly.</p>
            </section>
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

    .zone-overlay {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    .f3a-triangle {
        fill: none;
        stroke: #f0d83b;
        stroke-width: 2.5;
        stroke-linecap: butt;
        filter: drop-shadow(0 0 4px rgba(240, 216, 59, 0.45));
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

    .crosshair.home-locked {
        opacity: 0.95;
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

    .coords-lock {
        margin-right: 4px;
        filter: drop-shadow(0 0 4px rgba(138, 207, 53, 0.45));
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

    .home-panel {
        display: grid;
        gap: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid #2e434a;
    }

    .f3a-panel {
        display: grid;
        gap: 8px;
        padding: 10px;
        border: 1px solid #3a4a1b;
        border-radius: 10px;
        background: rgba(37, 37, 10, 0.18);
    }

    .zone-field {
        min-width: unset;
    }

    .zone-field input[type="range"] {
        width: 100%;
        padding: 0;
    }

    .zone-rotation-readout {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .home-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .home-coords {
        color: #a9d66c;
        font-family: "Space Mono", monospace;
        font-size: 0.82rem;
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
