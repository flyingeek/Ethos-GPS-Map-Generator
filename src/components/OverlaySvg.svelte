<script>
    export let mapWidth = 800;
    export let mapHeight = 480;
</script>

<svg
    class="zone-overlay hud-overlay"
    viewBox={`0 0 ${mapWidth} ${mapHeight}`}
    preserveAspectRatio="none"
>
    <slot />
</svg>

<style>
    .zone-overlay {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        shape-rendering: geometricPrecision;
    }
</style>
