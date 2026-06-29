<script>
    import OverlaySvg from "./OverlaySvg.svelte";

    /**
     * @typedef {Object} Props
     * @property {any} [screenPoint]
     * @property {number} [mapWidth]
     * @property {number} [mapHeight]
     */

    /** @type {Props} */
    let { screenPoint = null, mapWidth = 800, mapHeight = 480 } = $props();

    const SNAP_THRESHOLD = 12;

    let snapV = $derived(
        screenPoint && Math.abs(screenPoint.x - mapWidth / 2) < SNAP_THRESHOLD,
    );
    let snapH = $derived(
        screenPoint && Math.abs(screenPoint.y - mapHeight / 2) < SNAP_THRESHOLD,
    );

    let rx = $derived(snapV ? mapWidth / 2 : screenPoint?.x);
    let ry = $derived(snapH ? mapHeight / 2 : screenPoint?.y);

    let effectTimeout;
    // snapFlashActive is set to true by a map event (this $effect) and cleared
    // asynchronously by the timeout callback — the async write avoids a same-tick
    // read/write cycle. The synchronous false-branch write is safe because
    // snapFlashActive is never read inside this effect.
    let snapFlashActive = $state(false);

    $effect(() => {
        // Re-run whenever screenPoint changes (to reset the timer while dragging).
        const _trigger = screenPoint;
        const isSnapped = snapV || snapH;

        clearTimeout(effectTimeout);
        if (isSnapped) {
            snapFlashActive = true;
            effectTimeout = setTimeout(() => {
                snapFlashActive = false;
            }, 2000);
        } else {
            snapFlashActive = false;
        }

        return () => clearTimeout(effectTimeout);
    });

    let showSnapEffect = $derived(snapFlashActive && (snapV || snapH));
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
        stroke-width: 2;
        stroke-dasharray: 4 5;
        opacity: 0.45;
        shape-rendering: geometricPrecision;
    }
</style>
