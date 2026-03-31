<script>
    export let geometry = null;
    export let mapWidth = 800;
    export let mapHeight = 480;
</script>

{#if geometry}
    <svg
        class="zone-overlay hud-overlay"
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        preserveAspectRatio="none"
    >
        <line
            class="f3a-triangle"
            x1={geometry.apex.x}
            y1={geometry.apex.y}
            x2={geometry.left.x}
            y2={geometry.left.y}
        ></line>
        <line
            class="f3a-triangle"
            x1={geometry.apex.x}
            y1={geometry.apex.y}
            x2={geometry.right.x}
            y2={geometry.right.y}
        ></line>
        <line
            class="f3a-triangle-base"
            x1={geometry.left.x}
            y1={geometry.left.y}
            x2={geometry.right.x}
            y2={geometry.right.y}
        ></line>
    </svg>
{/if}

<style>
    :global(.f3a-triangle) {
        fill: none;
        stroke: #f0d83b;
        stroke-width: 2.5;
        stroke-linecap: butt;
        filter: drop-shadow(0 0 4px rgba(240, 216, 59, 0.45));
        shape-rendering: geometricPrecision;
    }

    :global(.f3a-triangle-base) {
        fill: none;
        stroke: #f0d83b;
        stroke-width: 1.5;
        stroke-linecap: butt;
        filter: drop-shadow(0 0 4px rgba(240, 216, 59, 0.45));
        shape-rendering: geometricPrecision;
    }
</style>
