<script>
    export let isActive = false;
    export let startPoint = null;
    export let targetPoint = null;
    export let mapWidth = 800;
    export let mapHeight = 480;
</script>

{#if isActive && startPoint && targetPoint}
    <svg
        class="zone-overlay hud-overlay"
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        preserveAspectRatio="none"
    >
        <line
            class="measure-guide"
            x1={startPoint.x}
            y1={startPoint.y}
            x2={targetPoint.x}
            y2={targetPoint.y}
        ></line>
        <circle
            class="measure-cursor-ring"
            cx={targetPoint.x}
            cy={targetPoint.y}
            r="6"
        ></circle>
        <line
            class="measure-cursor-mark"
            x1={targetPoint.x - 10}
            y1={targetPoint.y}
            x2={targetPoint.x + 10}
            y2={targetPoint.y}
        ></line>
        <line
            class="measure-cursor-mark"
            x1={targetPoint.x}
            y1={targetPoint.y - 10}
            x2={targetPoint.x}
            y2={targetPoint.y + 10}
        ></line>
    </svg>
{/if}

<style>
    :global(.measure-guide) {
        fill: none;
        stroke: #89dc33;
        stroke-width: 3;
        stroke-linecap: butt;
        stroke-dasharray: 7 6;
        filter: drop-shadow(0 0 4px rgba(137, 220, 51, 0.5));
        shape-rendering: geometricPrecision;
    }

    :global(.measure-cursor-ring) {
        fill: rgba(7, 16, 8, 0.2);
        stroke: #89dc33;
        stroke-width: 1.5;
        filter: drop-shadow(0 0 4px rgba(137, 220, 51, 0.45));
        shape-rendering: geometricPrecision;
    }

    :global(.measure-cursor-mark) {
        stroke: #89dc33;
        stroke-width: 1.5;
        stroke-linecap: butt;
        shape-rendering: geometricPrecision;
    }
</style>
