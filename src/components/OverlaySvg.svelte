<script>
</script>

<svg class="zone-overlay hud-overlay">
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
