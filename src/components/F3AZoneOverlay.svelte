<script>
    import OverlaySvg from "./OverlaySvg.svelte";

    export let geometry = null;
    export let color = "#f0d83b";

    $: rgb = color;
    $: shadow = `drop-shadow(0 0 4px ${color}73)`;
</script>

{#if geometry}
    <OverlaySvg>
        <line
            x1={geometry.apex.x}
            y1={geometry.apex.y}
            x2={geometry.left.x}
            y2={geometry.left.y}
            stroke={rgb}
            stroke-width="2.5"
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
            stroke-width="2.5"
            stroke-linecap="butt"
            filter={shadow}
            shape-rendering="geometricPrecision"
        />
        <line
            x1={geometry.left.x}
            y1={geometry.left.y}
            x2={geometry.right.x}
            y2={geometry.right.y}
            stroke={rgb}
            stroke-width="1.5"
            stroke-linecap="butt"
            filter={shadow}
            shape-rendering="geometricPrecision"
        />
    </OverlaySvg>
{/if}
