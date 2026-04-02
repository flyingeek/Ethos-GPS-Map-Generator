<script>
    import { onMount } from "svelte";
    import { buildRasterStyle, MAP_TYPES } from "./mapStyles.js";
    import {
        normalizeAngle,
        calculateMeasureState,
        toDms,
    } from "./lib/geoUtils.js";
    import {
        projectLngLat,
        projectF3AZoneGeometry,
    } from "./lib/overlayProjection.js";
    import {
        createExportArtifacts,
        downloadFile,
    } from "./lib/exportActions.js";
    import ProjectShelf from "./components/ProjectShelf.svelte";
    import SearchPanel from "./components/SearchPanel.svelte";
    import RotationSlider from "./components/RotationSlider.svelte";
    import F3AZoneOverlay from "./components/F3AZoneOverlay.svelte";
    import HomeCrosshairOverlay from "./components/HomeCrosshairOverlay.svelte";
    import MeasureLineOverlay from "./components/MeasureLineOverlay.svelte";

    let map;
    let mapContainer;
    let mapViewport;

    let mapTitle = "CestasMap";
    let resolution = "784,316";
    let customW = 800;
    let customH = 480;
    let mapType = "y";
    let zoomLock = false;
    let rotation = 42.5;

    let sdHandle = null;
    let isSdLinked = false;
    let syncMessage = "Save to folder";
    let supportsSdSync = false;

    let bounds = { north: 0, south: 0, west: 0, east: 0 };
    let center = { lat: 44.71607983566827, lng: -0.7165001920591294 };
    let zoom = 14.7;

    let isMeasureActive = false;
    let measureStart = null;
    let measureTarget = null;
    let measureCursorPoint = null;
    let measureTargetScreen = null;
    let measureDistanceM = 0;
    let measureBearing = 0;
    let measureRelativeAngle = 0;
    let homePosition = { lat: 44.714409685877825, lng: -0.7168534611050745 };
    let homeScreenPoint = null;
    let isF3AZoneVisible = true;
    let f3aRotation = 42.5;
    let f3aBaseDistance = 150;
    const f3aDefaultColor = "#ffffff";
    let f3aColor = f3aDefaultColor;
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

    $: if (map) {
        homePosition;
        isF3AZoneVisible;
        f3aRotation;
        f3aBaseDistance;
        refreshProjectedOverlays();
    }

    $: if (mapViewport) {
        mapViewport.style.width = `${mapWidth}px`;
        mapViewport.style.height = `${mapHeight}px`;
        if (map) {
            queueMicrotask(() => {
                map.resize();
                refreshProjectedOverlays();
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
            refreshProjectedOverlays();
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

    const MAPLIBRE_VERSION = "5.1.1";
    const MAPLIBRE_CSS_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
    const MAPLIBRE_JS_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
    const SD_BITMAPS_PATH = "";
    const SD_METADATA_PATH = "";

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

        supportsSdSync = typeof window.showDirectoryPicker === "function";

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
                    maxZoom: 21.9,
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
                    refreshProjectedOverlays();
                });

                map.on("move", () => {
                    refreshCenterAndZoom();
                    refreshBounds();
                    refreshProjectedOverlays();
                    if (isMeasureActive) {
                        if (measureCursorPoint) {
                            const hoverLngLat = map.unproject([
                                measureCursorPoint.x,
                                measureCursorPoint.y,
                            ]);
                            measureTarget = {
                                lat: hoverLngLat.lat,
                                lng: hoverLngLat.lng,
                            };
                        }
                        updateMeasureLine();
                    }
                });

                map.on("zoom", () => {
                    refreshCenterAndZoom();
                    refreshBounds();
                    refreshProjectedOverlays();
                    if (isMeasureActive) {
                        updateMeasureLine();
                    }
                });

                map.on("rotate", () => {
                    rotation = Number(map.getBearing().toFixed(1));
                    refreshProjectedOverlays();
                    if (isMeasureActive) {
                        updateMeasureLine();
                    }
                });

                map.on("mousemove", (event) => {
                    if (!isMeasureActive) {
                        return;
                    }

                    let cursorX = event.point.x;
                    let cursorY = event.point.y;
                    const nativeEvent = event.originalEvent;
                    if (nativeEvent && mapContainer) {
                        const rect = mapContainer.getBoundingClientRect();
                        cursorX = nativeEvent.clientX - rect.left;
                        cursorY = nativeEvent.clientY - rect.top;
                    }

                    const hoverLngLat = map.unproject([cursorX, cursorY]);

                    measureTarget = {
                        lat: hoverLngLat.lat,
                        lng: hoverLngLat.lng,
                    };
                    measureCursorPoint = {
                        x: cursorX,
                        y: cursorY,
                    };
                    measureTargetScreen = measureCursorPoint;
                    updateMeasureLine();
                });

                map.on("mouseout", () => {
                    if (!isMeasureActive) {
                        return;
                    }

                    measureTarget = null;
                    measureCursorPoint = null;
                    measureTargetScreen = null;
                    updateMeasureLine();
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

    function toggleMeasure() {
        if (!map) return;

        if (!isMeasureActive) {
            isMeasureActive = true;
            measureStart = homePosition ?? map.getCenter();
            measureTarget = null;
            measureCursorPoint = null;
            measureTargetScreen = null;
            measureDistanceM = 0;
            measureBearing = 0;
            measureRelativeAngle = 0;
            updateMeasureLine();
            return;
        }

        stopMeasure();
    }

    function stopMeasure() {
        isMeasureActive = false;
        measureStart = null;
        measureTarget = null;
        measureCursorPoint = null;
        measureTargetScreen = null;
        measureDistanceM = 0;
        measureBearing = 0;
        measureRelativeAngle = 0;
    }

    function updateMeasureLine() {
        if (!map) {
            return;
        }

        const reference = homePosition ?? map.getCenter();
        const target = measureTarget;

        if (!target) {
            measureDistanceM = 0;
            measureBearing = 0;
            measureRelativeAngle = 0;
            measureTargetScreen = null;
            return;
        }

        const measureState = calculateMeasureState(reference, target, rotation);
        measureDistanceM = measureState.distanceM;
        measureBearing = measureState.bearing;
        measureRelativeAngle = measureState.relativeAngle;
        measureTargetScreen = measureCursorPoint ?? projectLngLat(map, target);
    }

    function updateHomeCrosshairScreenPoint() {
        homeScreenPoint = projectLngLat(map, homePosition);
    }

    function refreshProjectedOverlays() {
        updateHomeCrosshairScreenPoint();
        updateF3AZoneOverlay();
    }

    function updateF3AZoneOverlay() {
        f3aZoneGeometry = projectF3AZoneGeometry(
            map,
            homePosition,
            f3aRotation,
            f3aBaseDistance,
            isF3AZoneVisible,
        );
    }

    function setHomePosition() {
        if (!map) return;
        const c = map.getCenter();
        homePosition = { lat: c.lat, lng: c.lng };
        refreshProjectedOverlays();
        if (isMeasureActive) {
            measureStart = homePosition;
            updateMeasureLine();
        }
    }

    function clearHomePosition() {
        homePosition = null;
        if (isMeasureActive) {
            stopMeasure();
        }
        isF3AZoneVisible = false;
        refreshProjectedOverlays();
    }

    function toggleF3AZone() {
        if (!isF3AZoneVisible && map) {
            f3aRotation = Number(map.getBearing().toFixed(1));
        }
        isF3AZoneVisible = !isF3AZoneVisible;
        refreshProjectedOverlays();
    }

    function resetF3ARotation() {
        f3aRotation = map ? Number(map.getBearing().toFixed(1)) : 0;
        refreshProjectedOverlays();
    }

    function cleanBaseName() {
        return (mapTitle.trim() || "EthosMap")
            .replace(/[^a-zA-Z0-9]/g, "_")
            .slice(0, 24);
    }

    async function handleDownloadZip() {
        const baseName = cleanBaseName();
        const { bmpBlob /*, jsonBlob*/, luaBlob /*, metaBlob*/ } =
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
                f3aZoneVisible: isF3AZoneVisible,
                f3aRotation,
                f3aBaseDistance,
                f3aOverlay:
                    isF3AZoneVisible && f3aZoneGeometry
                        ? { geometry: f3aZoneGeometry, color: f3aColor }
                        : null,
            });

        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        zip.file(`${baseName}.bmp`, bmpBlob);
        //zip.file(`${baseName}.json`, jsonBlob);
        zip.file(`${baseName}.lua`, luaBlob);
        //zip.file(`${baseName}_metadata.txt`, metaBlob);

        const outBlob = await zip.generateAsync({ type: "blob" });
        downloadFile(outBlob, `${baseName}.zip`);
    }

    async function linkSdCard() {
        if (!supportsSdSync) return;
        try {
            sdHandle = await window.showDirectoryPicker();
            isSdLinked = true;
        } catch (error) {
            if (error?.name !== "AbortError") {
                sdHandle = null;
                isSdLinked = false;
            }
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
        if (!supportsSdSync) return;
        if (!sdHandle) {
            await linkSdCard();
        }

        if (!sdHandle) {
            return;
        }

        const baseName = cleanBaseName();

        syncMessage = "Syncing...";
        const { bmpBlob /*, jsonBlob, */, luaBlob /*, metaBlob */ } =
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
                f3aZoneVisible: isF3AZoneVisible,
                f3aRotation,
                f3aBaseDistance,
                f3aOverlay:
                    isF3AZoneVisible && f3aZoneGeometry
                        ? { geometry: f3aZoneGeometry, color: f3aColor }
                        : null,
            });

        const bmpOk = await saveToSd(
            bmpBlob,
            SD_BITMAPS_PATH,
            `${baseName}.bmp`,
        );
        // const jsonOk = await saveToSd(
        //     jsonBlob,
        //     SD_METADATA_PATH,
        //     `${baseName}.json`,
        // );
        const luaOk = await saveToSd(
            luaBlob,
            SD_METADATA_PATH,
            `${baseName}.lua`,
        );
        // const metaOk = await saveToSd(
        //     metaBlob,
        //     SD_METADATA_PATH,
        //     `${baseName}_metadata.txt`,
        // );

        syncMessage = bmpOk && luaOk ? "Saved!" : "Save Failed";

        setTimeout(() => {
            syncMessage = "Save to folder";
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
        f3aRotation =
            typeof p.f3aRotation === "number" && Number.isFinite(p.f3aRotation)
                ? p.f3aRotation
                : f3aRotation;
        f3aBaseDistance = Math.max(1, Number(p.f3aBaseDistance) || 150);
        f3aColor =
            typeof p.f3aColor === "string" &&
            /^#[0-9a-fA-F]{6}$/.test(p.f3aColor)
                ? p.f3aColor
                : f3aDefaultColor;
        isF3AZoneVisible = Boolean(p.f3aZoneVisible) && Boolean(homePosition);

        if (map) {
            map.jumpTo({
                center: [p.center.lng, p.center.lat],
                zoom: p.zoom,
                bearing: p.rotation,
            });
            refreshProjectedOverlays();
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
                f3aZoneVisible: isF3AZoneVisible,
                f3aRotation,
                f3aBaseDistance,
                f3aColor,
            }}
            on:loadproject={handleLoadProject}
        />
    </header>

    <section class="panel controls">
        <div class="row">
            <label class="field">
                <span>Project Title</span>
                <input type="text" bind:value={mapTitle} maxlength="11" />
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
            <RotationSlider
                label="Rotation"
                bind:value={rotation}
                showStepButtons={true}
                stepSize={15}
                onStepClick={rotateStep}
                onReset={resetRotation}
            />

            <div class="action-controls">
                {#if supportsSdSync}
                    <div class="sync-group">
                        <button class="ok" on:click={handleSync}
                            >{syncMessage}</button
                        >
                        {#if isSdLinked && sdHandle}
                            <button
                                type="button"
                                class="sd-status-link"
                                on:click={linkSdCard}
                                title="Change the folder to save to"
                            >
                                📁 {sdHandle.name} (change)
                            </button>
                        {/if}
                    </div>
                {/if}
                <button class="ghost" on:click={handleDownloadZip}
                    >Download ZIP</button
                >
            </div>
        </div>

        {#if rotation !== 0}
            <p class="bounds-info">
                ⓘ Ethos GPS Map Widget only supports maps oriented North Up
                (rotation 0°)
            </p>
        {:else}
            <div class="bounds-grid">
                <div class="bounds-header">
                    <h3 class="bounds-title">Ethos GPS Map Widget Settings</h3>
                    <span class="bounds-save-hint"
                        >ⓘ map should be saved in the /bitmaps/gps folder</span
                    >
                </div>
                <div class="bounds-latlon">
                    <div class="bounds-row">
                        <span class="bounds-label">Latitude</span>
                        <div class="bounds-values">
                            <span class="bounds-val"
                                >{toDms(bounds.north, true)}</span
                            >
                            <span class="bounds-sep">-</span>
                            <span class="bounds-val"
                                >{toDms(bounds.south, true)}</span
                            >
                        </div>
                    </div>
                    <div class="bounds-row">
                        <span class="bounds-label">Longitude</span>
                        <div class="bounds-values">
                            <span class="bounds-val"
                                >{toDms(bounds.east, false)}</span
                            >
                            <span class="bounds-sep">-</span>
                            <span class="bounds-val"
                                >{toDms(bounds.west, false)}</span
                            >
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </section>

    <section class="workspace">
        <div class="map-column">
            <div
                class="map-box"
                class:measure-mode={isMeasureActive}
                bind:this={mapViewport}
                style={`width:${mapWidth}px;height:${mapHeight}px;`}
            >
                <div class="map-surface" bind:this={mapContainer}></div>
                <F3AZoneOverlay geometry={f3aZoneGeometry} color={f3aColor} />
                {#if homeScreenPoint}
                    <HomeCrosshairOverlay
                        screenPoint={homeScreenPoint}
                        {mapWidth}
                        {mapHeight}
                    />
                    <MeasureLineOverlay
                        isActive={isMeasureActive}
                        startPoint={homeScreenPoint}
                        targetPoint={measureTargetScreen}
                    />
                {:else}
                    <MeasureLineOverlay
                        isActive={isMeasureActive}
                        startPoint={{
                            x: mapWidth / 2,
                            y: mapHeight / 2,
                        }}
                        targetPoint={measureTargetScreen}
                    />
                    <div class="crosshair hud-overlay"></div>
                {/if}
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
                        📏 BRG {measureBearing.toFixed(1)}° | REL {measureRelativeAngle.toFixed(
                            1,
                        )}° | {measureDistanceM.toFixed(1)}m / {(
                            measureDistanceM * 3.28084
                        ).toFixed(0)}ft |
                        {#if measureTarget}
                            Lat: {measureTarget.lat.toFixed(6)}, Lng: {measureTarget.lng.toFixed(6)}
                        {:else}
                            —
                        {/if}
                    {:else}
                        {#if homePosition}
                            <span
                                class="coords-lock"
                                title="Home position is locked">🔒</span
                            >
                        {/if}
                        Lat: {hudReference.lat.toFixed(6)}, Lng: {hudReference.lng.toFixed(
                            6,
                        )}
                    {/if}
                </div>
                {#if isMeasureActive}
                    <div class="measure-hint">
                        Right-click to exit measure mode quickly
                    </div>
                {/if}
            </div>

            <SearchPanel {map} {mapWidth} />
        </div>

        <aside class="panel guide">
            <section class="home-panel" class:with-f3a={homePosition}>
                <h2>Reference Position</h2>
                <p>
                    Lock the crosshair to the current center and keep it pinned
                    while moving the map.
                </p>
                <div class="home-actions">
                    {#if homePosition}
                        <button class="warn" on:click={clearHomePosition}
                            >Clear Reference</button
                        >
                    {:else}
                        <button class="ok" on:click={setHomePosition}
                            >Set Reference Position</button
                        >
                    {/if}
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

            {#if homePosition}
                <section class="f3a-panel">
                    <h2>F3A Zone</h2>
                    <p>
                        Draw a 120° triangle from the reference position with
                        the base centered {Math.max(
                            1,
                            Number(f3aBaseDistance) || 150,
                        ).toFixed(0)}m away.
                    </p>
                    <div class="home-actions">
                        <button
                            class={isF3AZoneVisible ? "warn" : "ok"}
                            on:click={toggleF3AZone}
                            >{isF3AZoneVisible
                                ? "Remove Zone"
                                : "Show Zone"}</button
                        >
                    </div>
                    <label class="field zone-rotation-field">
                        <RotationSlider
                            label="Rotation"
                            bind:value={f3aRotation}
                            disabled={!isF3AZoneVisible}
                            onReset={resetF3ARotation}
                            inlineLabel={false}
                            horizontalSliderWidth={110}
                            horizontalWrap={false}
                        />
                    </label>
                    <div class="zone-dist-color-row">
                        <label class="field zone-field">
                            <span>Base Distance (m)</span>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                bind:value={f3aBaseDistance}
                            />
                        </label>
                        <label class="field zone-field">
                            <span>Zone Color</span>
                            <div class="color-row">
                                <input type="color" bind:value={f3aColor} />
                                {#if f3aColor !== f3aDefaultColor}
                                    <button
                                        class="reset-color"
                                        on:click={() =>
                                            (f3aColor = f3aDefaultColor)}
                                        >reset</button
                                    >
                                {/if}
                            </div>
                        </label>
                    </div>
                </section>
            {/if}
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

    .field > span {
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

    .action-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .sync-group {
        position: relative;
    }

    .sync-group > .ok {
        width: 120px;
    }

    .sd-status-link {
        position: absolute;
        top: calc(100% + 3px);
        left: 0;
        padding: 0 0 0 10px;
        border: 0;
        min-height: 0;
        background: transparent;
        color: #a2b4bc;
        font-family: "Space Mono", monospace;
        font-size: 0.72rem;
        font-weight: 400;
        letter-spacing: 0.02em;
        text-decoration: underline;
        text-underline-offset: 2px;
        cursor: pointer;
        white-space: nowrap;
    }

    .sd-status-link:hover {
        color: #c2d2d9;
    }

    .bounds-grid {
        display: grid;
        gap: 0;
        background: rgba(4, 9, 12, 0.6);
        border: 1px solid #304750;
        border-radius: 8px;
        overflow: hidden;
        font-family: "Space Mono", monospace;
    }

    .bounds-latlon {
        max-width: 784px;
    }

    .bounds-title {
        margin: 0;
        padding: 7px 12px;
        font-size: 0.8rem;
        color: #96adbc;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .bounds-header {
        display: flex;
        align-items: center;
        border-bottom: 1px solid #304750;
    }

    .bounds-save-hint {
        font-family: "Space Mono", monospace;
        font-size: 0.75rem;
        color: #96adbc;
        padding: 7px 12px;
    }

    .bounds-info {
        margin: 0;
        padding: 8px 12px;
        color: #7ab8cc;
        font-family: "Space Mono", monospace;
        font-size: 0.75rem;
    }

    .bounds-row {
        display: flex;
        align-items: center;
        padding: 6px 12px;
        gap: 8px;
        border-top: 1px solid #1e3038;
    }

    .bounds-label {
        color: #d0dde4;
        font-size: 0.85rem;
        min-width: 80px;
        flex-shrink: 0;
    }

    .bounds-values {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 6px;
        margin-left: auto;
    }

    .bounds-val {
        background: #1a2830;
        border: 1px solid #2f4b51;
        border-radius: 4px;
        padding: 3px 8px;
        color: #e8f2ea;
        font-size: 0.8rem;
        white-space: nowrap;
        text-align: right;
        min-width: 18ch;
    }

    .bounds-sep {
        color: #6a8a96;
        font-size: 0.8rem;
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
        width: 800px;
        justify-items: center;
    }

    .map-box {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        box-shadow:
            0 0 0 4px rgba(72, 119, 43, 0.75),
            0 0 24px rgba(137, 220, 51, 0.22);
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

    .measure-hint {
        position: absolute;
        left: 20px;
        bottom: -2px;
        color: #8acf35;
        font-family: "Space Mono", monospace;
        font-size: 0.7rem;
        font-weight: 700;
        text-shadow:
            -1px -1px #000,
            1px -1px #000,
            -1px 1px #000,
            1px 1px #000;
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
    }

    .home-panel.with-f3a {
        border-bottom: 1px solid #2e434a;
    }

    .f3a-panel {
        display: grid;
        gap: 8px;
    }

    .zone-dist-color-row {
        display: flex;
        gap: 10px;
        align-items: flex-end;
        flex-wrap: nowrap;
    }

    .zone-dist-color-row .zone-field {
        min-width: 0;
        flex: 1 1 auto;
    }

    .zone-dist-color-row .zone-field:last-child {
        flex: 0 0 auto;
    }

    .zone-rotation-field {
        min-width: unset;
    }

    .color-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .reset-color {
        all: unset;
        color: #6a9cbc;
        font-family: "Space Mono", monospace;
        font-size: 0.65rem;
        text-decoration: underline;
        text-underline-offset: 2px;
        cursor: pointer;
    }

    .reset-color:hover {
        color: #a8cfe0;
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

    :global(.map-box.measure-mode .maplibregl-canvas-container),
    :global(
            .map-box.measure-mode
                .maplibregl-canvas-container.maplibregl-interactive
        ),
    :global(
            .map-box.measure-mode
                .maplibregl-canvas-container.maplibregl-interactive:active
        ),
    :global(.map-box.measure-mode .maplibregl-canvas) {
        cursor: none !important;
    }
</style>
