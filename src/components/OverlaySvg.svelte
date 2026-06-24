<script>
    /**
     * @typedef {Object} Props
     * @property {import('svelte').Snippet} [children]
     */

    /** @type {Props} */
    let { children } = $props();
</script>

<svg class="zone-overlay hud-overlay">
    {@render children?.()}
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
