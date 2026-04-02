<script>
    import { normalizeAngle } from "../lib/geoUtils.js";
    import MouseWheelIcon from "./MouseWheelIcon.svelte";

    export let value = 0;
    export let label = "Rotation";
    export let disabled = false;
    export let showStepButtons = false;
    export let showResetButton = true;
    export let stepSize = 15;
    export let onStepClick = null;
    export let onReset = null;
    export let inlineLabel = true;
    export let horizontalSliderWidth = 280;
    export let horizontalWrap = true;
    export let rtl = false;

    function handleStep(delta) {
        if (onStepClick) {
            onStepClick(delta);
        } else {
            value = Math.min(180, Math.max(-180, value + delta));
        }
    }

    function handleReset() {
        if (onReset) {
            onReset();
        } else {
            value = 0;
        }
    }

    function handleWheel(event) {
        const step = rtl
            ? event.deltaY < 0
                ? 0.1
                : -0.1
            : event.deltaY < 0
              ? -0.1
              : 0.1;
        value = normalizeAngle(value + step);
    }
</script>

<div
    class="rotation-slider"
    class:stacked-label={!inlineLabel}
    class:no-wrap={!horizontalWrap}
    {disabled}
    style={`--horizontal-slider-width: ${typeof horizontalSliderWidth === "number" ? `${horizontalSliderWidth}px` : horizontalSliderWidth}`}
>
    {#if inlineLabel}
        <span class="label">{label}</span>
    {/if}
    <div class="horizontal-controls">
        {#if !inlineLabel}
            <span class="label">{label}</span>
        {/if}
        <div class="horizontal-row">
            {#if showStepButtons}
                <button
                    type="button"
                    on:click={() => handleStep(rtl ? stepSize : -stepSize)}
                >
                    ⟲ {stepSize}°
                </button>
            {/if}
            <input
                type="range"
                min="-180"
                max="180"
                step="0.1"
                bind:value
                class:rtl
                {disabled}
            />
            {#if showStepButtons}
                <button
                    type="button"
                    on:click={() => handleStep(rtl ? -stepSize : stepSize)}
                >
                    {stepSize}° ⟳
                </button>
            {/if}
            {#if showResetButton}
                <button
                    type="button"
                    class="ghost"
                    on:click={handleReset}
                    {disabled}
                >
                    Reset
                </button>
            {/if}
            <span
                class="bearing"
                title="Scroll to adjust by 0.1°"
                on:wheel|preventDefault={handleWheel}
            >
                {Number(Math.abs(value)).toFixed(1)}°{value > 0
                    ? "E"
                    : value < 0
                      ? "W"
                      : ""}
                <MouseWheelIcon size={18} />
            </span>
        </div>
    </div>
</div>

<style>
    .rotation-slider {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
    }

    .rotation-slider.stacked-label {
        flex-direction: column;
        align-items: stretch;
    }

    .rotation-slider.no-wrap {
        flex-wrap: nowrap;
    }

    .horizontal-controls {
        display: flex;
        flex: 1 1 auto;
        flex-direction: column;
    }

    .horizontal-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: inherit;
    }

    .rotation-slider.no-wrap .horizontal-row {
        flex-wrap: nowrap;
    }

    .rotation-slider[disabled] input[type="range"] {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .label {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #8da0ab;
        font-size: 0.7rem;
        font-weight: 700;
    }

    input[type="range"] {
        width: 100%;
        padding: 0;
        accent-color: #4ea1ff;
        -webkit-appearance: none;
        appearance: none;
        background: transparent;
        cursor: pointer;
    }

    input[type="range"].rtl {
        direction: rtl;
    }

    .rotation-slider input[type="range"] {
        width: var(--horizontal-slider-width);
        flex: 0 0 var(--horizontal-slider-width);
    }

    input[type="range"]::-webkit-slider-runnable-track {
        height: 6px;
        border-radius: 999px;
        background: linear-gradient(90deg, #2f71c9, #68b2ff);
    }

    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        margin-top: -4px;
        border-radius: 50%;
        background: #d9efff;
        border: 1px solid #2d6cc0;
        box-shadow: 0 0 6px rgba(78, 161, 255, 0.45);
        cursor: grab;
    }

    input[type="range"]::-webkit-slider-thumb:active {
        cursor: grabbing;
    }

    input[type="range"]::-moz-range-track {
        height: 6px;
        border-radius: 999px;
        background: linear-gradient(90deg, #2f71c9, #68b2ff);
    }

    input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #d9efff;
        border: 1px solid #2d6cc0;
        box-shadow: 0 0 6px rgba(78, 161, 255, 0.45);
        cursor: grab;
    }

    input[type="range"]::-moz-range-thumb:active {
        cursor: grabbing;
    }

    .bearing {
        min-width: 52px;
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 2px;
        font-family: "Space Mono", monospace;
        color: #9de44d;
    }

    .bearing :global(svg) {
        width: 18px;
        height: 18px;
        flex: 0 0 18px;
        opacity: 0.75;
        user-select: none;
        filter: drop-shadow(0 0 4px rgba(157, 228, 77, 0.35));
    }

    button {
        padding: 4px 8px;
        border: 1px solid #555;
        background: #1a1a1a;
        color: #ddd;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.15s;
    }

    button:hover:not(:disabled) {
        background: #2a2a2a;
        border-color: #777;
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    button.ghost {
        background: transparent;
        border-color: #444;
        color: #aaa;
    }

    button.ghost:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.05);
        border-color: #666;
    }
</style>
