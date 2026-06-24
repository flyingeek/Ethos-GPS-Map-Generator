<script>
    import F3ATools from "./F3ATools.svelte";
    import RunwayTools from "./RunwayTools.svelte";

    /**
     * @typedef {Object} Props
     * @property {boolean} [isIOS]
     * @property {boolean} [mapReady]
     */

    /** @type {Props} */
    let { isIOS = false, mapReady = false } = $props();
</script>

<aside class="panel guide">
    <RunwayTools {isIOS} {mapReady} on:startpick />
    <F3ATools on:sethome />
</aside>

<style>
    .guide {
        width: 308px;
        display: grid;
        gap: 8px;
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
</style>
