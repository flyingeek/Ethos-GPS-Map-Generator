<script>
    import OverlaySvg from "./OverlaySvg.svelte";

    export let screenPoint = null;
    export let mapWidth = 800;
    export let mapHeight = 480;

    const SNAP_THRESHOLD = 4;

    $: snapV =
        screenPoint && Math.abs(screenPoint.x - mapWidth / 2) < SNAP_THRESHOLD;
    $: snapH =
        screenPoint && Math.abs(screenPoint.y - mapHeight / 2) < SNAP_THRESHOLD;
</script>

{#if screenPoint}
    <OverlaySvg>
        {#if snapH}
            <line
                class="snap-guide"
                x1="0"
                y1={screenPoint.y}
                x2={mapWidth}
                y2={screenPoint.y}
            />
        {/if}
        {#if snapV}
            <line
                class="snap-guide"
                x1={screenPoint.x}
                y1="0"
                x2={screenPoint.x}
                y2={mapHeight}
            />
        {/if}
        <line
            class="locked-crosshair"
            x1={screenPoint.x - 20}
            y1={screenPoint.y}
            x2={screenPoint.x + 20}
            y2={screenPoint.y}
        ></line>
        <line
            class="locked-crosshair"
            x1={screenPoint.x}
            y1={screenPoint.y - 20}
            x2={screenPoint.x}
            y2={screenPoint.y + 20}
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
    }

    :global(.snap-guide) {
        stroke: #95ef37;
        stroke-width: 1;
        stroke-dasharray: 4 5;
        opacity: 0.45;
        shape-rendering: geometricPrecision;
    }
</style>
