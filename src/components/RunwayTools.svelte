<script>
    import { createEventDispatcher } from "svelte";
    import { normalizeBearing } from "../lib/geoUtils.js";
    import MouseWheelIcon from "./MouseWheelIcon.svelte";

    export let selectedRunway = null;
    export let isRunwayPickActive = false;
    export let isRunwayEditActive = false;
    export let runwayDirs = null;
    export let runwayStatus = "Pick runway ends to define runway.";
    export let isIOS = false;
    export let hasHome = false;
    export let mapReady = false;

    const dispatch = createEventDispatcher();

    function onWheel(event) {
        dispatch("wheel", event);
    }

    function onHeadingWheel(event) {
        dispatch("headingwheel", event);
    }
</script>

<section class="runway-panel" on:wheel={onWheel} class:with-f3a={hasHome}>
    <div class="runway-title-row">
        <h2>Runway</h2>
        {#if selectedRunway}
            <button
                class="runway-edit-btn"
                class:active={isRunwayEditActive}
                on:click={() => dispatch("toggleedit")}>Edit</button
            >
        {/if}
    </div>
    <p class="runway-status">
        {#if !selectedRunway}
            {runwayStatus}
        {:else if isIOS}
            <button
                type="button"
                class="ghost runway-step-btn runway-step-btn-left"
                on:click={() => dispatch("rotate", -0.1)}
            >
                ⟲ 0.1°
            </button>
            <span class="runway-bearing" on:wheel={onHeadingWheel}
                >RWY {normalizeBearing(selectedRunway.heading).toFixed(1)}°
                <MouseWheelIcon size={18} /></span
            >
            <button
                type="button"
                class="ghost runway-step-btn runway-step-btn-right"
                on:click={() => dispatch("rotate", 0.1)}
            >
                0.1° ⟳
            </button>
        {:else}
            <span class="runway-bearing" on:wheel={onHeadingWheel}
                >RWY {normalizeBearing(selectedRunway.heading).toFixed(1)}°
                <MouseWheelIcon size={18} /></span
            >
        {/if}
    </p>
    <div class="home-actions runway-actions">
        <button
            class={isRunwayPickActive || selectedRunway ? "warn" : "ghost"}
            disabled={!mapReady}
            on:click={() =>
                isRunwayPickActive
                    ? dispatch("cancelpick")
                    : selectedRunway
                      ? dispatch("clear")
                      : dispatch("startpick")}
            >{isRunwayPickActive
                ? "Cancel Pick"
                : selectedRunway
                  ? "Remove runway"
                  : "Pick Ends"}</button
        >
    </div>
</section>

<style>
    .runway-panel {
        display: grid;
        gap: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid #2e434a;
    }

    .runway-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .runway-title-row h2 {
        margin: 0;
        color: #96d547;
        font-size: 1rem;
    }

    .runway-status {
        margin: 0;
        color: #cad4d9;
        font-size: 0.86rem;
        min-height: 24px;
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }

    .runway-bearing {
        min-width: 52px;
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 2px;
        font-family: "Space Mono", monospace;
        color: #9de44d;
        cursor: ns-resize;
        user-select: none;
        touch-action: manipulation;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
    }

    .runway-bearing :global(svg) {
        width: 18px;
        height: 18px;
        flex: 0 0 18px;
        opacity: 0.75;
        user-select: none;
        filter: drop-shadow(0 0 4px rgba(157, 228, 77, 0.35));
    }

    .runway-step-btn {
        min-height: 32px;
        padding: 4px 8px;
        font-size: 0.75rem;
        white-space: nowrap;
        touch-action: manipulation;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        user-select: none;
    }

    .runway-edit-btn {
        color: #b8f971;
        background: rgba(4, 8, 10, 0.8);
        border: 2px solid #8acf35;
        border-radius: 7px;
        font-family: "Space Mono", monospace;
        font-weight: 700;
        font-size: 0.74rem;
        padding: 3px 9px;
        min-height: unset;
        cursor: pointer;
    }

    .runway-edit-btn.active {
        background: linear-gradient(135deg, #7fb729, #4a8f26);
        border-color: #90db35;
        color: #092409;
    }

    .runway-actions {
        align-items: center;
    }

    .home-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    button {
        border: 1px solid #2f4b51;
        background: #0c171b;
        color: #eff6f2;
        border-radius: 7px;
        padding: 8px 10px;
        font: inherit;
        min-height: 38px;
        cursor: pointer;
        font-weight: 700;
    }

    button.warn {
        background: linear-gradient(135deg, #d78931, #bc5f18);
        border-color: #f5a454;
        color: #fff9f0;
    }

    button.ghost {
        background: transparent;
        border-color: #4a666f;
    }
</style>
