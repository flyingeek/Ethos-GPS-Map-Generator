<script>
    import F3ATools from "./F3ATools.svelte";
    import RunwayTools from "./RunwayTools.svelte";

    /**
     * @typedef {Object} Props
     * @property {boolean} [mapReady]
     * @property {(() => void) | null} [onsethome]
     * @property {(() => void) | null} [onstartpick]
     */

    /** @type {Props} */
    let { mapReady = false, onsethome = null, onstartpick = null } = $props();
</script>

<aside class="panel guide">
    <RunwayTools {mapReady} {onstartpick} />
    <F3ATools {onsethome} />
</aside>

<style>
    .guide {
        width: 308px;
        display: grid;
        gap: 8px;
    }
</style>
