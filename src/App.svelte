<script>
    import { onMount } from "svelte";
    import { isIOS } from "./lib/deviceInfo.js";
    import { buildRasterStyle, MAP_TYPES } from "./mapStyles.js";
    import { normalizeAngle, calculateMeasureState } from "./lib/geoUtils.js";
    import {
        projectLngLat,
        projectF3AZoneGeometry,
    } from "./lib/overlayProjection.js";
    import {
        buildRunwayFromScreen,
        projectRunway,
        rotateRunway,
    } from "./lib/runwayUtils.js";
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
    let selectedRunway = null;
    let projectedRunway = null;
    let isRunwayPickActive = false;
    let isRunwayEditActive = false;
    let runwayPickStart = null;
    let runwayPickStartScreen = null;
    let runwayStatus = "Pick runway ends to define runway.";

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
        map.dragRotate.disable();
        map.touchPitch.disable();
    }

    $: if (map) {
        map.setBearing(rotation);
    }

    $: runwayDirs = (() => {
        if (!selectedRunway) return null;
        // Check if the runway is roughly horizontal on screen (within ±15° of 90°/270°)
        const screenAngle =
            (((selectedRunway.heading - rotation) % 360) + 360) % 360;
        const distFrom90 = Math.min(
            Math.abs(screenAngle - 90),
            Math.abs(screenAngle - 270),
        );
        // Perpendicular headings (0–360)
        const perp1 = (selectedRunway.heading + 90 + 360) % 360;
        const perp2 = (selectedRunway.heading - 90 + 360) % 360;
        // Map's up direction (0–360)
        const mapUp = ((rotation % 360) + 360) % 360;
        // Which perp is closer to map up?
        const diff1 = Math.min(
            Math.abs(perp1 - mapUp),
            360 - Math.abs(perp1 - mapUp),
        );
        const upPerp = diff1 <= 90 ? perp1 : perp2;
        const downPerp = diff1 <= 90 ? perp2 : perp1;
        return {
            topLabel: formatPerpLabel(upPerp),
            bottomLabel: formatPerpLabel(downPerp),
        };
    })();

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
            map.touchZoomRotate.disableRotation();
            map.touchZoomRotate.enable();
            map.keyboard.enable();
        }
    }

    let maplibreglApi = null;

    onMount(() => {
        let cancelled = false;

        const init = async () => {
            try {
                maplibreglApi = await ensureMapLibreApi();
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
                    // MapLibre normalises -180 → 180 (same angle). Guard against that
                    // causing a full-range jump on the RTL slider.
                    if (Math.abs(newBearing - rotation) < 360) {
                        rotation = newBearing;
                    }
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
                    if (isRunwayPickActive) {
                        cancelRunwayPick();
                    }
                });

                map.on("click", (event) => {
                    handleRunwayMapClick(event);
                });

                map.on("dragend", () => {
                    if (!homePosition) return;
                    const sp = projectLngLat(map, homePosition);
                    if (!sp) return;

                    const cx = mapWidth / 2;
                    const cy = mapHeight / 2;
                    const dx = cx - sp.x;
                    const dy = cy - sp.y;

                    const SNAP_THRESHOLD = 12; // Must match HomeCrosshairOverlay

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
        updateRunwayOverlay();
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

    function updateRunwayOverlay() {
        projectedRunway = projectRunway(map, selectedRunway);
        runwayPickStartScreen = runwayPickStart
            ? projectLngLat(map, runwayPickStart)
            : null;
    }

    // Convert 0–360 bearing to ±180 E/W label (same convention as RotationSlider)
    function formatPerpLabel(bearing) {
        const val = bearing > 180 ? bearing - 360 : bearing;
        const abs = Number(Math.abs(val).toFixed(1));
        const dir = val > 0 ? "E" : val < 0 ? "W" : "";
        return `${abs}°${dir}`;
    }

    function clearRunwaySelection() {
        stopRunwayEdit();
        selectedRunway = null;
        runwayPickStart = null;
        isRunwayPickActive = false;
        runwayStatus = "Pick runway ends to define runway.";
        updateRunwayOverlay();
    }

    function updateSelectedRunway(runway, statusMessage) {
        selectedRunway = runway;
        runwayStatus = statusMessage;
        updateRunwayOverlay();
    }

    function rotateSelectedRunway(deltaDeg) {
        if (!selectedRunway) return;
        updateSelectedRunway(
            rotateRunway(selectedRunway, deltaDeg),
            `Runway axis rotated ${deltaDeg > 0 ? "+" : ""}${deltaDeg.toFixed(1)}°.`,
        );
    }

    function toggleRunwayEdit() {
        if (!map || !selectedRunway) return;
        isRunwayEditActive = !isRunwayEditActive;
        if (isRunwayEditActive) {
            map.dragPan.disable();
            map.scrollZoom.disable();
            map.doubleClickZoom.disable();
        } else {
            map.dragPan.enable();
            map.scrollZoom.enable();
            map.doubleClickZoom.enable();
        }
    }

    function stopRunwayEdit() {
        if (!isRunwayEditActive) return;
        isRunwayEditActive = false;
        if (map) {
            map.dragPan.enable();
            map.scrollZoom.enable();
            map.doubleClickZoom.enable();
        }
    }

    function handleEndpointDrag(event) {
        if (!selectedRunway || !map || !mapContainer) return;
        const { endpoint, clientX, clientY } = event.detail;
        const rect = mapContainer.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const newFirst =
            endpoint === "first" ? { x, y } : projectedRunway.firstPoint;
        const newLast =
            endpoint === "last" ? { x, y } : projectedRunway.lastPoint;
        updateSelectedRunway(
            buildRunwayFromScreen(map, newFirst, newLast, {
                source: selectedRunway.source,
                stripWidth: selectedRunway.stripWidth,
            }),
            "Runway edited.",
        );
    }

    function handleRunwayWheel(event) {
        if (!selectedRunway) return;
        event.preventDefault();
        rotateSelectedRunway(event.deltaY > 0 ? -0.1 : 0.1);
    }

    function handleRunwayHeadingWheel(event) {
        if (!selectedRunway) return;
        event.preventDefault();
        event.stopPropagation();
        rotateSelectedRunway(event.deltaY > 0 ? 0.1 : -0.1);
    }

    function startRunwayPick() {
        if (!map) return;
        if (isMeasureActive) {
            stopMeasure();
        }
        selectedRunway = null;
        runwayPickStart = null;
        isRunwayPickActive = true;
        runwayStatus = "Click one runway end, then the other.";
        updateRunwayOverlay();
    }

    function cancelRunwayPick() {
        isRunwayPickActive = false;
        runwayPickStart = null;
        runwayStatus = selectedRunway
            ? "Runway selected."
            : "Pick runway ends to define runway.";
        updateRunwayOverlay();
    }

    function handleRunwayMapClick(event) {
        if (!isRunwayPickActive || !map) return;

        const clickedPoint = { x: event.point.x, y: event.point.y };
        if (!runwayPickStart) {
            const start = map.unproject([clickedPoint.x, clickedPoint.y]);
            runwayPickStart = { lat: start.lat, lng: start.lng };
            runwayStatus = "Now click the other runway end.";
            updateRunwayOverlay();
            return;
        }

        const startPoint = projectLngLat(map, runwayPickStart);
        selectedRunway = buildRunwayFromScreen(map, startPoint, clickedPoint, {
            source: "manual",
            stripWidth: 18,
        });
        isRunwayPickActive = false;
        runwayPickStart = null;
        runwayStatus = "Manual runway picked.";
        updateRunwayOverlay();
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

        const r = p.selectedRunway;
        if (
            r?.start?.lat != null &&
            r?.start?.lng != null &&
            r?.end?.lat != null &&
            r?.end?.lng != null
        ) {
            selectedRunway = {
                source: r.source ?? "manual",
                confidence: 1,
                score: 1,
                stripWidth: r.stripWidth ?? 18,
                start: r.start,
                end: r.end,
                center: r.center,
                heading: r.heading,
                lengthM: r.lengthM,
            };
            runwayStatus = "Runway selected.";
        } else {
            selectedRunway = null;
            runwayStatus = "Pick runway ends to define runway.";
        }

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
            if (isRunwayEditActive) stopRunwayEdit();
            if (isRunwayPickActive) cancelRunwayPick();
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
                selectedRunway: selectedRunway
                    ? {
                          source: selectedRunway.source,
                          stripWidth: selectedRunway.stripWidth,
                          start: selectedRunway.start,
                          end: selectedRunway.end,
                          center: selectedRunway.center,
                          heading: selectedRunway.heading,
                          lengthM: selectedRunway.lengthM,
                      }
                    : null,
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
        </div>

        <div class="row rotate-row">
            <RotationSlider
                label="Rotation"
                bind:value={rotation}
                showStepButtons={true}
                stepSize={15}
                onStepClick={rotateStep}
                onReset={resetRotation}
                rtl={true}
            />

            <ExportControls
                {map}
                projectSnapshot={{
                    mapTitle,
                    mapViewport,
                    mapWidth,
                    mapHeight,
                    bounds,
                    rotation,
                    zoom,
                    mapType,
                    center,
                    homePosition,
                    f3aZoneVisible: isF3AZoneVisible,
                    f3aRotation,
                    f3aBaseDistance,
                    f3aColor,
                    f3aOverlay:
                        isF3AZoneVisible && f3aZoneGeometry
                            ? { geometry: f3aZoneGeometry, color: f3aColor }
                            : null,
                    selectedRunway,
                }}
            />
        </div>

        <EthosBoundsDisplay {bounds} {rotation} />
    </section>

    <section class="workspace">
        <div class="map-column">
            <div class="coords" style={`min-width:${mapWidth}px;`}>
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

            <div
                class="map-box"
                class:measure-mode={isMeasureActive}
                class:runway-pick-mode={isRunwayPickActive}
                bind:this={mapViewport}
                style={`width:${mapWidth}px;height:${mapHeight}px;`}
            >
                <div class="map-surface" bind:this={mapContainer}></div>
                <F3AZoneOverlay geometry={f3aZoneGeometry} color={f3aColor} />
                <RunwayOverlay
                    runway={projectedRunway}
                    pendingPoint={runwayPickStartScreen}
                    isPicking={isRunwayPickActive}
                    isEditing={isRunwayEditActive}
                    on:endpointdrag={handleEndpointDrag}
                />
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
                <button
                    class={`zoom-badge hud-overlay ${zoomLock ? "locked" : ""}`}
                    on:click={() => (zoomLock = !zoomLock)}
                    title={zoomLock
                        ? "Zoom locked — click to unlock"
                        : "Click to lock zoom"}
                >
                    {zoomLock ? "🔒 " : ""}Zoom: {zoom.toFixed(1)}
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

            <SearchPanel {map} {mapWidth} />
        </div>

        <ToolsSidebar
            {homePosition}
            {isF3AZoneVisible}
            bind:f3aRotation
            bind:f3aBaseDistance
            bind:f3aColor
            {runwayDirs}
            {selectedRunway}
            {isRunwayPickActive}
            {isRunwayEditActive}
            {runwayStatus}
            isIOS={$isIOS}
            mapReady={!!map}
            on:sethome={setHomePosition}
            on:clearhome={clearHomePosition}
            on:togglef3a={toggleF3AZone}
            on:resetf3arotation={resetF3ARotation}
            on:wheel={(e) => handleRunwayWheel(e.detail)}
            on:headingwheel={(e) => handleRunwayHeadingWheel(e.detail)}
            on:toggleedit={toggleRunwayEdit}
            on:rotate={(e) => rotateSelectedRunway(e.detail)}
            on:startpick={startRunwayPick}
            on:cancelpick={cancelRunwayPick}
            on:clear={clearRunwaySelection}
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
