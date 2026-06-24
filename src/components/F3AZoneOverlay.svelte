<script>
    import OverlaySvg from "./OverlaySvg.svelte";

    /**
     * @typedef {Object} Props
     * @property {any} [geometry]
     * @property {any} color
     */

    /** @type {Props} */
    let { geometry = null, color } = $props();

    let rgb = $derived(color);
    let shadow = $derived(`drop-shadow(0 0 4px ${color}73)`);
</script>

{#if geometry}
    <OverlaySvg>
        <line
            x1={geometry.apex.x}
            y1={geometry.apex.y}
            x2={geometry.left.x}
            y2={geometry.left.y}
            stroke={rgb}
            stroke-width="1.5"
            stroke-linecap="butt"
            filter={shadow}
            shape-rendering="geometricPrecision"
        />
        <line
            x1={geometry.apex.x}
            y1={geometry.apex.y}
            x2={geometry.right.x}
            y2={geometry.right.y}
            stroke={rgb}
            stroke-width="1.5"
            stroke-linecap="butt"
            filter={shadow}
            shape-rendering="geometricPrecision"
        />
        <line
            x1={geometry.leftBase.x}
            y1={geometry.leftBase.y}
            x2={geometry.rightBase.x}
            y2={geometry.rightBase.y}
            stroke={rgb}
            stroke-width="1.5"
            stroke-linecap="butt"
            filter={shadow}
            shape-rendering="geometricPrecision"
        />
    </OverlaySvg>
{/if}
