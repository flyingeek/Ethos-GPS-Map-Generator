<script>
    import OverlaySvg from "./OverlaySvg.svelte";

    export let screenPoint = null;
    export let mapWidth = 800;
    export let mapHeight = 480;

    const SNAP_THRESHOLD = 12;

    $: snapV =
        screenPoint && Math.abs(screenPoint.x - mapWidth / 2) < SNAP_THRESHOLD;
    $: snapH =
        screenPoint && Math.abs(screenPoint.y - mapHeight / 2) < SNAP_THRESHOLD;

    $: rx = snapV ? mapWidth / 2 : screenPoint?.x;
    $: ry = snapH ? mapHeight / 2 : screenPoint?.y;

    let effectTimeout;
    let showSnapEffect = false;

    $: {
        // Depend on screenPoint directly to reset timeout continuously while moving inside the zone
        const _trigger = screenPoint;
        const isSnapped = snapV || snapH;

        if (isSnapped) {
            showSnapEffect = true;
            clearTimeout(effectTimeout);
            effectTimeout = setTimeout(() => {
                showSnapEffect = false;
            }, 2000);
        } else {
            showSnapEffect = false;
            clearTimeout(effectTimeout);
        }
    }
</script>

{#if screenPoint}
    <OverlaySvg>
        {#if snapH && showSnapEffect}
            <line class="snap-guide" x1="0" y1={ry} x2={mapWidth} y2={ry} />
        {/if}
        {#if snapV && showSnapEffect}
            <line class="snap-guide" x1={rx} y1="0" x2={rx} y2={mapHeight} />
        {/if}
        <line
            class="locked-crosshair"
            class:snapped={showSnapEffect && (snapH || snapV)}
            x1={rx - 20}
            y1={ry}
            x2={rx + 20}
            y2={ry}
        ></line>
        <line
            class="locked-crosshair"
            class:snapped={showSnapEffect && (snapH || snapV)}
            x1={rx}
            y1={ry - 20}
            x2={rx}
            y2={ry + 20}
        ></line>
    </OverlaySvg>
{/if}

<style>
    :global(.locked-crosshair) {
        stroke: #95ef37;
        stroke-width: 2;
        stroke-linecap: butt;
        filter: drop-shadow(0 0 8px rgba(149, 239, 55, 0.65));
        shape-rendering: geometricPrecision;
        transition:
            stroke-width 0.1s,
            filter 0.1s;
    }

    :global(.locked-crosshair.snapped) {
        stroke: #b1ff5e;
        stroke-width: 3;
        filter: drop-shadow(0 0 12px rgba(177, 255, 94, 0.85));
    }

    :global(.snap-guide) {
        stroke: #95ef37;
        stroke-width: 1;
        stroke-dasharray: 4 5;
        opacity: 0.45;
        shape-rendering: geometricPrecision;
    }
</style>
