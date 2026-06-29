<script>
    import { onMount, setContext, untrack } from "svelte";
    import { isIOS } from "./lib/deviceInfo.svelte.js";
    import { buildRasterStyle, MAP_TYPES } from "./mapStyles.js";
    import { normalizeAngle, calculateMeasureState } from "./lib/geoUtils.js";
    import {
        projectLngLat,
        projectF3AZoneGeometry,
    } from "./lib/overlayProjection.js";
    import { buildRunwayFromScreen, projectRunway } from "./lib/runwayUtils.js";
    import { AppState } from "./lib/appState.svelte.js";
    import ProjectShelf from "./components/ProjectShelf.svelte";
    import SearchPanel from "./components/SearchPanel.svelte";
    import RotationSlider from "./components/RotationSlider.svelte";
    import F3AZoneOverlay from "./components/F3AZoneOverlay.svelte";
    import HomeCrosshairOverlay from "./components/HomeCrosshairOverlay.svelte";
    import MeasureLineOverlay from "./components/MeasureLineOverlay.svelte";
    import RunwayOverlay from "./components/RunwayOverlay.svelte";
    import EthosBoundsDisplay from "./components/EthosBoundsDisplay.svelte";
    import ExportControls from "./components/ExportControls.svelte";
    import ToolsSidebar from "./components/ToolsSidebar.svelte";
    import ethosLogoUrl from "../ethos logo.png";
    import { ensureMapLibreApi } from "./lib/mapLoader.js";

    const appState = new AppState();
    setContext("app", appState);

    let map = $state(null);
    let mapContainer = $state(null);
    let mapViewport = $state(null);
    let maplibreglApi = $state(null);

    // Map-derived state (owned by map events)
    let bounds = $state({ north: 0, south: 0, west: 0, east: 0 });
    let center = $state({ lat: 44.71607983566827, lng: -0.7165001920591294 });
    let zoom = $state(14.7);

    // Map-projection version counter — increments on resize so $derived overlays
    // recompute even when center/zoom/rotation did not change.
    let mapVersion = $state(0);

    // Projected screen coordinates — $derived.by so they auto-update whenever
    // the map viewport (center, zoom, rotation, size) or the relevant appState
    // properties change. Reading center/zoom/appState.rotation/mapVersion as
    // reactive dependencies ensures recomputation after every map event.
    let homeScreenPoint = $derived.by(() => {
        if (!map || !appState.homePosition) return null;
        center;
        zoom;
        appState.rotation;
        mapVersion;
        return projectLngLat(map, appState.homePosition);
    });
    let f3aZoneGeometry = $derived.by(() => {
        if (!map) return null;
        center;
        zoom;
        appState.rotation;
        mapVersion;
        return projectF3AZoneGeometry(
            map,
            appState.homePosition,
            appState.f3aRotation,
            appState.f3aBaseDistance,
            appState.isF3AZoneVisible,
        );
    });
    let projectedRunway = $derived.by(() => {
        if (!map) return null;
        center;
        zoom;
        appState.rotation;
        mapVersion;
        return projectRunway(map, appState.selectedRunway);
    });
    let runwayPickStartScreen = $derived.by(() => {
        if (!map || !appState.runwayPickStart) return null;
        center;
        zoom;
        appState.rotation;
        mapVersion;
        return projectLngLat(map, appState.runwayPickStart);
    });

    // Measure tool (ephemeral, needs map)
    let isMeasureActive = $state(false);
    let measureStart = $state(null);
    let measureTarget = $state(null);
    let measureCursorPoint = $state(null);
    let measureTargetScreen = $state(null);
    let measureDistanceM = $state(0);
    let measureBearing = $state(0);
    let measureRelativeAngle = $state(0);

    let hudReference = $derived(appState.homePosition ?? center);

    // Sync viewport element size when map dimensions change
    $effect(() => {
        if (!mapViewport) return;
        mapViewport.style.width = `${appState.mapWidth}px`;
        mapViewport.style.height = `${appState.mapHeight}px`;
        if (map) {
            queueMicrotask(() => {
                map.resize();
            });
        }
    });

    // Sync map tile style when mapType changes
    $effect(() => {
        if (!map) return;
        const mapType = appState.mapType;
        untrack(() => {
            const savedMapState = {
                center: map.getCenter(),
                zoom: map.getZoom(),
                bearing: map.getBearing(),
                pitch: map.getPitch(),
            };
            map.setStyle(buildRasterStyle(mapType));
            map.once("styledata", () => {
                map.jumpTo(savedMapState);
                refreshBounds();
            });
        });
    });

    // Sync bearing from state.rotation → map
    $effect(() => {
        if (!map) return;
        const rotation = appState.rotation;
        untrack(() => {
            if (Math.abs(map.getBearing() - rotation) > 0.05) {
                map.setBearing(rotation);
            }
        });
    });

    // Sync zoom lock → map interaction handlers
    $effect(() => {
        if (!map) return;
        if (appState.zoomLock) {
            map.scrollZoom.disable();
            map.doubleClickZoom.disable();
            map.touchZoomRotate.disableRotation();
            map.touchZoomRotate.disable();
            map.keyboard.disable();
        } else {
            map.scrollZoom.enable();
            map.doubleClickZoom.enable();
            map.touchZoomRotate.disableRotation();
            map.touchZoomRotate.enable();
            map.keyboard.enable();
        }
    });

    // Sync runway edit mode → map pan/zoom interactions
    $effect(() => {
        if (!map) return;
        if (appState.isRunwayEditActive) {
            map.dragPan.disable();
            map.scrollZoom.disable();
            map.doubleClickZoom.disable();
        } else {
            map.dragPan.enable();
            map.scrollZoom.enable();
            map.doubleClickZoom.enable();
        }
    });

    // Stop measure tool when home position is cleared (but not when measure is
    // simply started without a home — untrack isMeasureActive so toggling it on
    // does not re-run this effect and immediately kill measure).
    $effect(() => {
        if (!appState.homePosition) {
            untrack(() => {
                if (isMeasureActive) stopMeasure();
            });
        }
    });

    onMount(() => {
        let cancelled = false;

        const init = async () => {
            try {
                maplibreglApi = await ensureMapLibreApi();
                if (cancelled || !maplibreglApi) return;

                map = new maplibreglApi.Map({
                    container: mapContainer,
                    style: buildRasterStyle(appState.mapType),
                    center: [center.lng, center.lat],
                    zoom,
                    bearing: appState.rotation,
                    preserveDrawingBuffer: true,
                    attributionControl: false,
                    maxZoom: 21.9,
                });

                // One-time setup: disable rotate/pitch gestures
                map.dragRotate.disable();
                map.touchPitch.disable();
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
                map.addControl(
                    new maplibreglApi.AttributionControl({ compact: false }),
                    "bottom-left",
                );

                map.on("load", () => {
                    refreshBounds();
                    refreshCenterAndZoom();
                });

                map.on("move", () => {
                    refreshCenterAndZoom();
                    refreshBounds();
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
                    if (isMeasureActive) {
                        updateMeasureLine();
                    }
                });

                map.on("rotate", () => {
                    const newBearing = Number(map.getBearing().toFixed(1));
                    if (newBearing !== appState.rotation) {
                        appState.rotation = newBearing;
                    }
                    if (isMeasureActive) {
                        updateMeasureLine();
                    }
                });

                map.on("mousemove", (event) => {
                    if (!isMeasureActive) return;

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
                    measureCursorPoint = { x: cursorX, y: cursorY };
                    measureTargetScreen = measureCursorPoint;
                    updateMeasureLine();
                });

                map.on("mouseout", () => {
                    if (!isMeasureActive) return;
                    measureTarget = null;
                    measureCursorPoint = null;
                    measureTargetScreen = null;
                    updateMeasureLine();
                });

                map.on("contextmenu", () => {
                    if (isMeasureActive) toggleMeasure();
                    if (appState.isRunwayPickActive)
                        appState.cancelRunwayPick();
                });

                map.on("click", (event) => {
                    handleRunwayMapClick(event);
                });

                map.on("dragend", () => {
                    if (!appState.homePosition) return;
                    const sp = projectLngLat(map, appState.homePosition);
                    if (!sp) return;

                    const cx = appState.mapWidth / 2;
                    const cy = appState.mapHeight / 2;
                    const dx = cx - sp.x;
                    const dy = cy - sp.y;
                    const SNAP_THRESHOLD = 12;

                    let needsEase = false;
                    let targetScreenPoint = map.project(map.getCenter());

                    if (Math.abs(dx) < SNAP_THRESHOLD) {
                        targetScreenPoint.x -= dx;
                        needsEase = true;
                    }
                    if (Math.abs(dy) < SNAP_THRESHOLD) {
                        targetScreenPoint.y -= dy;
                        needsEase = true;
                    }

                    if (needsEase) {
                        map.easeTo({
                            center: map.unproject(targetScreenPoint),
                            duration: 200,
                            easing: (t) => t * (2 - t),
                        });
                    }
                });

                map.on("resize", () => {
                    mapVersion++;
                });
            } catch (error) {
                console.error("MapLibre initialization failed:", error);
            }
        };

        init();

        return () => {
            cancelled = true;
            if (map) map.remove();
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
        appState.rotation = normalizeAngle(appState.rotation + step);
        if (map) map.easeTo({ bearing: appState.rotation, duration: 250 });
    }

    function resetRotation() {
        appState.rotation = 0;
        if (map) map.easeTo({ bearing: 0, duration: 260 });
    }

    function toggleMeasure() {
        if (!map) return;
        if (!isMeasureActive) {
            isMeasureActive = true;
            measureStart = appState.homePosition ?? map.getCenter();
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
        if (!map) return;
        const reference = appState.homePosition ?? map.getCenter();
        const target = measureTarget;
        if (!target) {
            measureDistanceM = 0;
            measureBearing = 0;
            measureRelativeAngle = 0;
            measureTargetScreen = null;
            return;
        }
        const measureState = calculateMeasureState(
            reference,
            target,
            appState.rotation,
        );
        measureDistanceM = measureState.distanceM;
        measureBearing = measureState.bearing;
        measureRelativeAngle = measureState.relativeAngle;
        measureTargetScreen = measureCursorPoint ?? projectLngLat(map, target);
    }

    function setHomePosition() {
        if (!map) return;
        const c = map.getCenter();
        appState.setHomePosition(c.lat, c.lng);
        if (isMeasureActive) {
            measureStart = appState.homePosition;
            updateMeasureLine();
        }
    }

    function startRunwayPick() {
        if (!map) return;
        if (isMeasureActive) stopMeasure();
        appState.startRunwayPick();
    }

    function handleEndpointDrag({ endpoint, clientX, clientY }) {
        if (!appState.selectedRunway || !map || !mapContainer) return;
        const rect = mapContainer.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const newFirst =
            endpoint === "first" ? { x, y } : projectedRunway.firstPoint;
        const newLast =
            endpoint === "last" ? { x, y } : projectedRunway.lastPoint;
        appState.updateSelectedRunway(
            buildRunwayFromScreen(map, newFirst, newLast, {
                source: appState.selectedRunway.source,
                stripWidth: appState.selectedRunway.stripWidth,
            }),
            "Runway edited.",
        );
        // projectedRunway refreshed by the reactive overlay block
    }

    function handleRunwayMapClick(event) {
        if (!appState.isRunwayPickActive || !map) return;

        const clickedPoint = { x: event.point.x, y: event.point.y };
        if (!appState.runwayPickStart) {
            const start = map.unproject([clickedPoint.x, clickedPoint.y]);
            appState.runwayPickStart = { lat: start.lat, lng: start.lng };
            appState.runwayStatus = "Now click the other runway end.";
            return;
        }

        const startPoint = projectLngLat(map, appState.runwayPickStart);
        appState.updateSelectedRunway(
            buildRunwayFromScreen(map, startPoint, clickedPoint, {
                source: "manual",
                stripWidth: 18,
            }),
            "Manual runway picked.",
        );
        appState.isRunwayPickActive = false;
        appState.runwayPickStart = null;
    }

    function handleLoadProject({ project }) {
        const p = project;
        if (!p) return;

        appState.loadProject(p);

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

<svelte:window
    onkeydown={(e) => {
        if (e.key === "Escape") {
            if (appState.isRunwayEditActive) appState.stopRunwayEdit();
            if (appState.isRunwayPickActive) appState.cancelRunwayPick();
        }
    }}
/>
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
        <img src={ethosLogoUrl} alt="Ethos" class="logo" />
        <div>
            <h1>Ethos GPS Map Generator</h1>
            <p>Svelte Edition with rotation-aware exports</p>
        </div>

        <ProjectShelf
            projectState={appState.toSnapshot(center, zoom, bounds)}
            onloadproject={handleLoadProject}
        />
    </header>

    <section class="panel controls">
        <div class="row">
            <label class="field">
                <span>Project Title</span>
                <input
                    type="text"
                    bind:value={appState.mapTitle}
                    maxlength="11"
                />
            </label>

            <label class="field">
                <span>Resolution</span>
                <select bind:value={appState.resolution}>
                    <option value="800,480">X20/X18 (800x480)</option>
                    <option value="784,316">X20/X18 (784x316)</option>
                    <option value="480,320">X18 (480x320)</option>
                    <option value="custom">Custom</option>
                </select>
            </label>

            {#if appState.resolution === "custom"}
                <label class="field mini">
                    <span>Width</span>
                    <input
                        type="number"
                        bind:value={appState.customW}
                        min="150"
                        step="1"
                    />
                </label>

                <label class="field mini">
                    <span>Height</span>
                    <input
                        type="number"
                        bind:value={appState.customH}
                        min="120"
                        step="1"
                    />
                </label>
            {/if}

            <label class="field">
                <span>Map Type</span>
                <select bind:value={appState.mapType}>
                    {#each Object.entries(MAP_TYPES) as [value, label]}
                        <option {value}>{label}</option>
                    {/each}
                </select>
            </label>
        </div>

        <div class="row rotate-row">
            <RotationSlider
                label="Rotation"
                bind:value={appState.rotation}
                showStepButtons={true}
                stepSize={15}
                onStepClick={rotateStep}
                onReset={resetRotation}
                rtl={true}
            />

            <ExportControls
                {map}
                projectSnapshot={{
                    mapTitle: appState.mapTitle,
                    mapViewport,
                    mapWidth: appState.mapWidth,
                    mapHeight: appState.mapHeight,
                    bounds,
                    rotation: appState.rotation,
                    zoom,
                    mapType: appState.mapType,
                    center,
                    homePosition: appState.homePosition,
                    f3aZoneVisible: appState.isF3AZoneVisible,
                    f3aRotation: appState.f3aRotation,
                    f3aBaseDistance: appState.f3aBaseDistance,
                    f3aColor: appState.f3aColor,
                    f3aOverlay:
                        appState.isF3AZoneVisible && f3aZoneGeometry
                            ? {
                                  geometry: f3aZoneGeometry,
                                  color: appState.f3aColor,
                              }
                            : null,
                    selectedRunway: appState.selectedRunway,
                }}
            />
        </div>

        <EthosBoundsDisplay {bounds} rotation={appState.rotation} />
    </section>

    <section class="workspace">
        <div class="map-column">
            <div class="coords" style={`min-width:${appState.mapWidth}px;`}>
                {#if isMeasureActive}
                    📏 BRG {measureBearing.toFixed(1)}° | REL {measureRelativeAngle.toFixed(
                        1,
                    )}° | {measureDistanceM.toFixed(1)}m / {(
                        measureDistanceM * 3.28084
                    ).toFixed(0)}ft
                    <span class="coords-sep">|</span>
                    {#if measureTarget}
                        Lat: {measureTarget.lat.toFixed(6)}, Lng: {measureTarget.lng.toFixed(
                            6,
                        )}
                    {:else}
                        —
                    {/if}
                {:else}
                    {#if appState.homePosition}
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

            <div
                class="map-box"
                class:measure-mode={isMeasureActive}
                class:runway-pick-mode={appState.isRunwayPickActive}
                bind:this={mapViewport}
                style={`width:${appState.mapWidth}px;height:${appState.mapHeight}px;`}
            >
                <div class="map-surface" bind:this={mapContainer}></div>
                <F3AZoneOverlay
                    geometry={f3aZoneGeometry}
                    color={appState.f3aColor}
                />
                <RunwayOverlay
                    runway={projectedRunway}
                    pendingPoint={runwayPickStartScreen}
                    isPicking={appState.isRunwayPickActive}
                    isEditing={appState.isRunwayEditActive}
                    onendpointdrag={handleEndpointDrag}
                />
                {#if homeScreenPoint}
                    <HomeCrosshairOverlay
                        screenPoint={homeScreenPoint}
                        mapWidth={appState.mapWidth}
                        mapHeight={appState.mapHeight}
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
                            x: appState.mapWidth / 2,
                            y: appState.mapHeight / 2,
                        }}
                        targetPoint={measureTargetScreen}
                    />
                    <div class="crosshair hud-overlay"></div>
                {/if}
                <button
                    class={`zoom-badge hud-overlay ${appState.zoomLock ? "locked" : ""}`}
                    onclick={() => (appState.zoomLock = !appState.zoomLock)}
                    title={appState.zoomLock
                        ? "Zoom locked — click to unlock"
                        : "Click to lock zoom"}
                >
                    {appState.zoomLock ? "🔒 " : ""}Zoom: {zoom.toFixed(1)}
                </button>
                <button
                    class={`measure-btn hud-overlay ${isMeasureActive ? "active" : ""}`}
                    onclick={toggleMeasure}
                >
                    Measure
                </button>
                {#if isMeasureActive}
                    <div class="measure-hint">
                        Right-click to exit measure mode quickly
                    </div>
                {/if}
            </div>

            <SearchPanel {map} mapWidth={appState.mapWidth} />
        </div>

        <ToolsSidebar
            mapReady={!!map}
            onsethome={setHomePosition}
            onstartpick={startRunwayPick}
        />
    </section>
</div>

<style>
    .page-shell {
        width: 1120px;
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

    .rotate-row {
        justify-content: space-between;
        align-items: center;
        gap: 12px;
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
            0 0 0 2px rgba(72, 119, 43, 0.75),
            0 0 24px rgba(137, 220, 51, 0.22);
        background: #000;
        flex-shrink: 0;
    }

    .map-box.runway-pick-mode,
    :global(.map-box.runway-pick-mode .maplibregl-canvas-container),
    :global(.map-box.runway-pick-mode .maplibregl-canvas) {
        cursor: crosshair !important;
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
    .measure-btn {
        position: absolute;
        right: 10px;
        color: #b8f971;
        background: rgba(4, 8, 10, 0.8);
        border: 2px solid #8acf35;
        border-radius: 7px;
        font-family: "Space Mono", monospace;
        font-weight: 700;
        font-size: 0.74rem;
        backdrop-filter: blur(2px);
    }

    .zoom-badge {
        top: 10px;
        padding: 5px 9px;
        cursor: pointer;
        min-height: unset;
    }

    .zoom-badge.locked {
        background: linear-gradient(135deg, #7fb729, #4a8f26);
        border-color: #90db35;
        color: #092409;
    }

    .measure-btn {
        top: 46px;
        padding: 5px 9px;
        cursor: pointer;
        min-height: unset;
    }

    .measure-hint {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        bottom: -2px;
        color: #8acf35;
        font-family: "Space Mono", monospace;
        font-size: 0.7rem;
        font-weight: 700;
        white-space: nowrap;
        text-shadow:
            -1px -1px #000,
            1px -1px #000,
            -1px 1px #000,
            1px 1px #000;
    }

    .measure-btn.active {
        background: linear-gradient(135deg, #7fb729, #4a8f26);
        border-color: #90db35;
        color: #092409;
    }

    .coords {
        align-self: center;
        max-width: 100%;
        box-sizing: border-box;
        padding: 6px 12px;
        color: #b8f971;
        background: rgba(4, 8, 10, 0.88);
        box-shadow: 0 0 0 2px #8acf35;
        border-radius: 7px;
        font-family: "Space Mono", monospace;
        font-weight: 700;
        font-size: 0.74rem;
        text-shadow: 1px 1px #000;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
    }

    .coords-sep {
        margin: 0 4px;
        color: #6aaf30;
    }

    .coords-lock {
        margin-right: 4px;
        filter: drop-shadow(0 0 4px rgba(138, 207, 53, 0.45));
    }

    :global(.maplibregl-ctrl-bottom-right .maplibregl-ctrl-scale) {
        background: rgba(4, 8, 10, 0.8);
        border: 2px solid #8acf35;
        color: #fff;
        border-top: none;
        font-family: "Space Mono", monospace;
        font-weight: 700;
    }

    :global(.maplibregl-ctrl-attrib),
    :global(.maplibregl-ctrl-attrib.maplibregl-compact) {
        background: rgba(255, 255, 255, 0.5) !important;
        font-family: "Space Mono", monospace !important;
        color: #000 !important;
    }

    :global(.maplibregl-ctrl-attrib a),
    :global(.maplibregl-ctrl-attrib-inner) {
        font-family: "Space Mono", monospace !important;
        color: #000 !important;
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
