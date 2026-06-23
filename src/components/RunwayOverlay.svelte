<script>
    import { createEventDispatcher } from "svelte";
    import OverlaySvg from "./OverlaySvg.svelte";
    import { normalizeBearing } from "../lib/geoUtils.js";

    export let runway = null;
    export let pendingPoint = null;
    export let isPicking = false;
    export let isEditing = false;

    const dispatch = createEventDispatcher();

    let hasRunway = false;
    let width = 18;
    let dx = 0;
    let dy = 0;
    let length = 1;
    let nx = 0;
    let ny = 0;
    let halfWidth = 9;
    let polygon = "";
    let labelX = 0;
    let labelY = 0;
    let label = "";
    let dragging = null; // 'first' | 'last' | null

    $: hasRunway = Boolean(runway?.firstPoint && runway?.lastPoint);
    $: width = Math.max(10, Math.min(32, runway?.stripWidth ?? 18));
    $: dx = hasRunway ? runway.lastPoint.x - runway.firstPoint.x : 0;
    $: dy = hasRunway ? runway.lastPoint.y - runway.firstPoint.y : 0;
    $: length = Math.hypot(dx, dy) || 1;
    $: nx = -dy / length;
    $: ny = dx / length;
    $: halfWidth = width / 2;
    $: polygon = hasRunway
        ? [
              `${runway.firstPoint.x + nx * halfWidth},${runway.firstPoint.y + ny * halfWidth}`,
              `${runway.lastPoint.x + nx * halfWidth},${runway.lastPoint.y + ny * halfWidth}`,
              `${runway.lastPoint.x - nx * halfWidth},${runway.lastPoint.y - ny * halfWidth}`,
              `${runway.firstPoint.x - nx * halfWidth},${runway.firstPoint.y - ny * halfWidth}`,
          ].join(" ")
        : "";
    $: labelX = hasRunway ? runway.centerPoint.x + nx * (halfWidth + 12) : 0;
    $: labelY = hasRunway ? runway.centerPoint.y + ny * (halfWidth + 12) : 0;
    $: label = hasRunway
        ? `${normalizeBearing(runway.heading).toFixed(1)}° / ${runway.lengthM.toFixed(0)}m`
        : "";

    function onPointerDown(e, endpoint) {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging = endpoint;
    }

    function onPointerMove(e) {
        if (!dragging) return;
        dispatch("endpointdrag", {
            endpoint: dragging,
            clientX: e.clientX,
            clientY: e.clientY,
        });
    }

    function onPointerUp(e) {
        if (!dragging) return;
        dragging = null;
        dispatch("endpointdragend");
    }
</script>

{#if hasRunway || pendingPoint}
    <OverlaySvg>
        {#if hasRunway}
            <polygon class="runway-strip" points={polygon}></polygon>
            <line
                class="runway-centerline"
                x1={runway.firstPoint.x}
                y1={runway.firstPoint.y}
                x2={runway.lastPoint.x}
                y2={runway.lastPoint.y}
            ></line>
            {#if isEditing || isPicking}
                <circle
                    class="runway-endpoint"
                    class:runway-endpoint-active={dragging === "first"}
                    cx={runway.firstPoint.x}
                    cy={runway.firstPoint.y}
                    r={dragging === "first" ? 7 : 5}
                ></circle>
                <circle
                    class="runway-endpoint"
                    class:runway-endpoint-active={dragging === "last"}
                    cx={runway.lastPoint.x}
                    cy={runway.lastPoint.y}
                    r={dragging === "last" ? 7 : 5}
                ></circle>
            {/if}
            <text class="runway-label" x={labelX} y={labelY}>{label}</text>
            {#if isEditing}
                <circle
                    role="button"
                    tabindex="0"
                    class="runway-endpoint-hit"
                    class:runway-endpoint-hit-dragging={dragging === "first"}
                    cx={runway.firstPoint.x}
                    cy={runway.firstPoint.y}
                    r="14"
                    on:pointerdown={(e) => onPointerDown(e, "first")}
                    on:pointermove={onPointerMove}
                    on:pointerup={onPointerUp}
                    on:pointercancel={onPointerUp}
                ></circle>
                <circle
                    role="button"
                    tabindex="0"
                    class="runway-endpoint-hit"
                    class:runway-endpoint-hit-dragging={dragging === "last"}
                    cx={runway.lastPoint.x}
                    cy={runway.lastPoint.y}
                    r="14"
                    on:pointerdown={(e) => onPointerDown(e, "last")}
                    on:pointermove={onPointerMove}
                    on:pointerup={onPointerUp}
                    on:pointercancel={onPointerUp}
                ></circle>
            {/if}
        {/if}

        {#if isPicking && pendingPoint}
            <circle
                class="runway-pending"
                cx={pendingPoint.x}
                cy={pendingPoint.y}
                r="7"
            ></circle>
            <line
                class="runway-pending-mark"
                x1={pendingPoint.x - 12}
                y1={pendingPoint.y}
                x2={pendingPoint.x + 12}
                y2={pendingPoint.y}
            ></line>
            <line
                class="runway-pending-mark"
                x1={pendingPoint.x}
                y1={pendingPoint.y - 12}
                x2={pendingPoint.x}
                y2={pendingPoint.y + 12}
            ></line>
        {/if}
    </OverlaySvg>
{/if}

<style>
    :global(.runway-strip) {
        fill: rgba(255, 211, 94, 0.22);
        stroke: rgba(255, 211, 94, 0.8);
        stroke-width: 1.5;
        filter: drop-shadow(0 0 5px rgba(255, 211, 94, 0.5));
        shape-rendering: geometricPrecision;
    }

    :global(.runway-centerline) {
        stroke: #fff3b0;
        stroke-width: 2;
        stroke-linecap: butt;
        stroke-dasharray: 10 7;
        filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.9));
        shape-rendering: geometricPrecision;
    }

    :global(.runway-endpoint),
    :global(.runway-pending) {
        fill: #0b1410;
        stroke: #ffd35e;
        stroke-width: 2;
        filter: drop-shadow(0 0 4px rgba(255, 211, 94, 0.6));
        shape-rendering: geometricPrecision;
    }

    :global(.runway-pending-mark) {
        stroke: #ffd35e;
        stroke-width: 1.5;
        stroke-linecap: butt;
        shape-rendering: geometricPrecision;
    }

    :global(.runway-label) {
        fill: #fff3b0;
        paint-order: stroke;
        stroke: #050807;
        stroke-width: 4px;
        stroke-linejoin: round;
        font-family: "Space Mono", monospace;
        font-size: 11px;
        font-weight: 700;
    }

    :global(.runway-endpoint-active) {
        stroke: #fff;
        stroke-width: 2.5;
        filter: drop-shadow(0 0 6px rgba(255, 243, 176, 0.9));
    }

    :global(.runway-endpoint-hit) {
        fill: transparent;
        stroke: none;
        pointer-events: all;
        cursor: grab;
    }

    :global(.runway-endpoint-hit-dragging) {
        cursor: grabbing;
    }
</style>
