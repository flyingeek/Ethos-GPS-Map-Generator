<script>
    import { onMount, setContext } from "svelte";
    import { isIOS } from "./lib/deviceInfo.js";
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

    const state = new AppState();
    setContext("app", state);

    let map;
    let mapContainer;
    let mapViewport;
    let maplibreglApi = null;

    // Map-derived state (owned by map events)
    let bounds = { north: 0, south: 0, west: 0, east: 0 };
    let center = { lat: 44.71607983566827, lng: -0.7165001920591294 };
    let zoom = 14.7;

    // Projected screen coordinates
    let homeScreenPoint = null;
    let f3aZoneGeometry = null;
    let projectedRunway = null;
    let runwayPickStartScreen = null;

    // Measure tool (ephemeral, needs map)
    let isMeasureActive = false;
    let measureStart = null;
    let measureTarget = null;
    let measureCursorPoint = null;
    let measureTargetScreen = null;
    let measureDistanceM = 0;
    let measureBearing = 0;
    let measureRelativeAngle = 0;

    $: hudReference = state.homePosition ?? center;

    // Sync viewport element size when map dimensions change
    $: if (mapViewport) {
        mapViewport.style.width = `${state.mapWidth}px`;
        mapViewport.style.height = `${state.mapHeight}px`;
        if (map) {
            queueMicrotask(() => {
                map.resize();
                refreshProjectedOverlays();
            });
        }
    }

    // Sync map tile style when mapType changes
    $: if (map) {
        const savedMapState = {
            center: map.getCenter(),
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch(),
        };
        map.setStyle(buildRasterStyle(state.mapType));
        map.once("styledata", () => {
            map.jumpTo(savedMapState);
            refreshBounds();
            refreshProjectedOverlays();
        });
    }

    // One-time setup: disable rotate/pitch gestures
    $: if (map) {
        map.dragRotate.disable();
        map.touchPitch.disable();
    }

    // Sync bearing from state.rotation → map
    $: if (map) {
        map.setBearing(state.rotation);
    }

    // Sync zoom lock → map interaction handlers
    $: if (map) {
        if (state.zoomLock) {
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
    }

    // Sync runway edit mode → map pan/zoom interactions
    $: if (map) {
        if (state.isRunwayEditActive) {
            map.dragPan.disable();
            map.scrollZoom.disable();
            map.doubleClickZoom.disable();
        } else {
            map.dragPan.enable();
            map.scrollZoom.enable();
            map.doubleClickZoom.enable();
        }
    }

    // Refresh projected overlays when overlay-relevant state changes
    $: if (map) {
        state.homePosition;
        state.isF3AZoneVisible;
        state.f3aRotation;
        state.f3aBaseDistance;
        state.selectedRunway;
        state.runwayPickStart;
        refreshProjectedOverlays();
        // Stop measure tool if home position was cleared
        if (!state.homePosition && isMeasureActive) stopMeasure();
    }

    onMount(() => {
        let cancelled = false;

        const init = async () => {
            try {
                maplibreglApi = await ensureMapLibreApi();
                if (cancelled || !maplibreglApi) return;

                map = new maplibreglApi.Map({
                    container: mapContainer,
                    style: buildRasterStyle(state.mapType),
                    center: [center.lng, center.lat],
                    zoom,
                    bearing: state.rotation,
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
                map.addControl(
                    new maplibreglApi.AttributionControl({ compact: false }),
                    "bottom-left",
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
                    const newBearing = Number(map.getBearing().toFixed(1));
                    if (Math.abs(newBearing - state.rotation) < 360) {
                        state.rotation = newBearing;
                    }
                    refreshProjectedOverlays();
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
                    if (state.isRunwayPickActive) state.cancelRunwayPick();
                });

                map.on("click", (event) => {
                    handleRunwayMapClick(event);
                });

                map.on("dragend", () => {
                    if (!state.homePosition) return;
                    const sp = projectLngLat(map, state.homePosition);
                    if (!sp) return;

                    const cx = state.mapWidth / 2;
                    const cy = state.mapHeight / 2;
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
        state.rotation = normalizeAngle(state.rotation + step);
        if (map) map.easeTo({ bearing: state.rotation, duration: 250 });
    }

    function resetRotation() {
        state.rotation = 0;
        if (map) map.easeTo({ bearing: 0, duration: 260 });
    }

    function toggleMeasure() {
        if (!map) return;
        if (!isMeasureActive) {
            isMeasureActive = true;
            measureStart = state.homePosition ?? map.getCenter();
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
        const reference = state.homePosition ?? map.getCenter();
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
            state.rotation,
        );
        measureDistanceM = measureState.distanceM;
        measureBearing = measureState.bearing;
        measureRelativeAngle = measureState.relativeAngle;
        measureTargetScreen = measureCursorPoint ?? projectLngLat(map, target);
    }

    function refreshProjectedOverlays() {
        homeScreenPoint = projectLngLat(map, state.homePosition);
        f3aZoneGeometry = projectF3AZoneGeometry(
            map,
            state.homePosition,
            state.f3aRotation,
            state.f3aBaseDistance,
            state.isF3AZoneVisible,
        );
        projectedRunway = projectRunway(map, state.selectedRunway);
        runwayPickStartScreen = state.runwayPickStart
            ? projectLngLat(map, state.runwayPickStart)
            : null;
    }

    function setHomePosition() {
        if (!map) return;
        const c = map.getCenter();
        state.setHomePosition(c.lat, c.lng);
        refreshProjectedOverlays();
        if (isMeasureActive) {
            measureStart = state.homePosition;
            updateMeasureLine();
        }
    }

    function startRunwayPick() {
        if (!map) return;
        if (isMeasureActive) stopMeasure();
        state.startRunwayPick();
        refreshProjectedOverlays();
    }

    function handleEndpointDrag(event) {
        if (!state.selectedRunway || !map || !mapContainer) return;
        const { endpoint, clientX, clientY } = event.detail;
        const rect = mapContainer.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const newFirst =
            endpoint === "first" ? { x, y } : projectedRunway.firstPoint;
        const newLast =
            endpoint === "last" ? { x, y } : projectedRunway.lastPoint;
        state.updateSelectedRunway(
            buildRunwayFromScreen(map, newFirst, newLast, {
                source: state.selectedRunway.source,
                stripWidth: state.selectedRunway.stripWidth,
            }),
            "Runway edited.",
        );
        // projectedRunway refreshed by the reactive overlay block
    }

    function handleRunwayMapClick(event) {
        if (!state.isRunwayPickActive || !map) return;

        const clickedPoint = { x: event.point.x, y: event.point.y };
        if (!state.runwayPickStart) {
            const start = map.unproject([clickedPoint.x, clickedPoint.y]);
            state.runwayPickStart = { lat: start.lat, lng: start.lng };
            state.runwayStatus = "Now click the other runway end.";
            refreshProjectedOverlays();
            return;
        }

        const startPoint = projectLngLat(map, state.runwayPickStart);
        state.updateSelectedRunway(
            buildRunwayFromScreen(map, startPoint, clickedPoint, {
                source: "manual",
                stripWidth: 18,
            }),
            "Manual runway picked.",
        );
        state.isRunwayPickActive = false;
        state.runwayPickStart = null;
        refreshProjectedOverlays();
    }

    function handleLoadProject(event) {
        const p = event.detail?.project;
        if (!p) return;

        state.loadProject(p);

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

<svelte:window
    on:keydown={(e) => {
        if (e.key === "Escape") {
            if (state.isRunwayEditActive) state.stopRunwayEdit();
            if (state.isRunwayPickActive) state.cancelRunwayPick();
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
            projectState={state.toSnapshot(center, zoom, bounds)}
            on:loadproject={handleLoadProject}
        />
    </header>

    <section class="panel controls">
        <div class="row">
            <label class="field">
                <span>Project Title</span>
                <input type="text" bind:value={state.mapTitle} maxlength="11" />
            </label>

            <label class="field">
                <span>Resolution</span>
                <select bind:value={state.resolution}>
                    <option value="800,480">X20/X18 (800x480)</option>
                    <option value="784,316">X20/X18 (784x316)</option>
                    <option value="480,320">X18 (480x320)</option>
                    <option value="custom">Custom</option>
                </select>
            </label>

            {#if state.resolution === "custom"}
                <label class="field mini">
                    <span>Width</span>
                    <input
                        type="number"
                        bind:value={state.customW}
                        min="150"
                        step="1"
                    />
                </label>

                <label class="field mini">
                    <span>Height</span>
                    <input
                        type="number"
                        bind:value={state.customH}
                        min="120"
                        step="1"
                    />
                </label>
            {/if}

            <label class="field">
                <span>Map Type</span>
                <select bind:value={state.mapType}>
                    {#each Object.entries(MAP_TYPES) as [value, label]}
                        <option {value}>{label}</option>
                    {/each}
                </select>
            </label>
        </div>

        <div class="row rotate-row">
            <RotationSlider
                label="Rotation"
                bind:value={state.rotation}
                showStepButtons={true}
                stepSize={15}
                onStepClick={rotateStep}
                onReset={resetRotation}
                rtl={true}
            />

            <ExportControls
                {map}
                projectSnapshot={{
                    mapTitle: state.mapTitle,
                    mapViewport,
                    mapWidth: state.mapWidth,
                    mapHeight: state.mapHeight,
                    bounds,
                    rotation: state.rotation,
                    zoom,
                    mapType: state.mapType,
                    center,
                    homePosition: state.homePosition,
                    f3aZoneVisible: state.isF3AZoneVisible,
                    f3aRotation: state.f3aRotation,
                    f3aBaseDistance: state.f3aBaseDistance,
                    f3aColor: state.f3aColor,
                    f3aOverlay:
                        state.isF3AZoneVisible && f3aZoneGeometry
                            ? {
                                  geometry: f3aZoneGeometry,
                                  color: state.f3aColor,
                              }
                            : null,
                    selectedRunway: state.selectedRunway,
                }}
            />
        </div>

        <EthosBoundsDisplay {bounds} rotation={state.rotation} />
    </section>

    <section class="workspace">
        <div class="map-column">
            <div class="coords" style={`min-width:${state.mapWidth}px;`}>
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
                    {#if state.homePosition}
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
                class:runway-pick-mode={state.isRunwayPickActive}
                bind:this={mapViewport}
                style={`width:${state.mapWidth}px;height:${state.mapHeight}px;`}
            >
                <div class="map-surface" bind:this={mapContainer}></div>
                <F3AZoneOverlay
                    geometry={f3aZoneGeometry}
                    color={state.f3aColor}
                />
                <RunwayOverlay
                    runway={projectedRunway}
                    pendingPoint={runwayPickStartScreen}
                    isPicking={state.isRunwayPickActive}
                    isEditing={state.isRunwayEditActive}
                    on:endpointdrag={handleEndpointDrag}
                />
                {#if homeScreenPoint}
                    <HomeCrosshairOverlay
                        screenPoint={homeScreenPoint}
                        mapWidth={state.mapWidth}
                        mapHeight={state.mapHeight}
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
                            x: state.mapWidth / 2,
                            y: state.mapHeight / 2,
                        }}
                        targetPoint={measureTargetScreen}
                    />
                    <div class="crosshair hud-overlay"></div>
                {/if}
                <button
                    class={`zoom-badge hud-overlay ${state.zoomLock ? "locked" : ""}`}
                    on:click={() => (state.zoomLock = !state.zoomLock)}
                    title={state.zoomLock
                        ? "Zoom locked — click to unlock"
                        : "Click to lock zoom"}
                >
                    {state.zoomLock ? "🔒 " : ""}Zoom: {zoom.toFixed(1)}
                </button>
                <button
                    class={`measure-btn hud-overlay ${isMeasureActive ? "active" : ""}`}
                    on:click={toggleMeasure}
                >
                    Measure
                </button>
                {#if isMeasureActive}
                    <div class="measure-hint">
                        Right-click to exit measure mode quickly
                    </div>
                {/if}
            </div>

            <SearchPanel {map} mapWidth={state.mapWidth} />
        </div>

        <ToolsSidebar
            isIOS={$isIOS}
            mapReady={!!map}
            on:sethome={setHomePosition}
            on:startpick={startRunwayPick}
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
