<script>
    import { createEventDispatcher } from "svelte";
    import F3ATools from "./F3ATools.svelte";
    import RunwayTools from "./RunwayTools.svelte";

    export let homePosition = null;
    export let isF3AZoneVisible = false;
    export let f3aRotation = 0;
    export let f3aBaseDistance = 150;
    export let f3aColor = "#ffffff";
    export let runwayDirs = null;
    export let selectedRunway = null;
    export let isRunwayPickActive = false;
    export let isRunwayEditActive = false;
    export let runwayStatus = "Pick runway ends to define runway.";
    export let isIOS = false;
    export let mapReady = false;

    const dispatch = createEventDispatcher();
</script>

<aside class="panel guide">
    <RunwayTools
        {selectedRunway}
        {isRunwayPickActive}
        {isRunwayEditActive}
        {runwayDirs}
        {runwayStatus}
        {isIOS}
        hasHome={!!homePosition}
        {mapReady}
        on:wheel
        on:headingwheel
        on:toggleedit
        on:rotate
        on:startpick
        on:cancelpick
        on:clear
    />
    <F3ATools
        {homePosition}
        {isF3AZoneVisible}
        bind:f3aRotation
        bind:f3aBaseDistance
        bind:f3aColor
        {runwayDirs}
        on:sethome
        on:clearhome
        on:togglef3a
        on:resetf3arotation
    />
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
