<script>
    import { normalizeAngle } from "../lib/geoUtils.js";

    export let value = 0;
    export let label = "Rotation";
    export let disabled = false;
    export let showStepButtons = false;
    export let stepSize = 15;
    export let onStepClick = null;
    export let onReset = null;
    export let showReadout = true;
    export let readoutSlot = false;
    export let layout = "vertical"; // "vertical" or "horizontal"

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
        const step = event.deltaY < 0 ? 0.1 : -0.1;
        value = normalizeAngle(value + step);
    }
</script>

<div
    class="rotation-slider"
    class:horizontal={layout === "horizontal"}
    {disabled}
>
    {#if layout === "horizontal"}
        <!-- Horizontal layout for map controls -->
        <span class="label">{label}</span>
        <button type="button" on:click={() => handleStep(-stepSize)}>
            ⟳ -{stepSize}°
        </button>
        <input
            type="range"
            min="-180"
            max="180"
            step="0.1"
            bind:value
            {disabled}
        />
        <button type="button" on:click={() => handleStep(stepSize)}>
            +{stepSize}° ⟲
        </button>
        <button type="button" class="ghost" on:click={handleReset}>
            Reset
        </button>
        <span
            class="bearing"
            title="Scroll to adjust by 0.1°"
            on:wheel|preventDefault={handleWheel}
            >{Number(value).toFixed(1)}°</span
        >
        <span
            class="wheel-hint"
            aria-hidden="true"
            title="Use mouse wheel here"
        >
            🖱️
        </span>
    {:else}
        <!-- Vertical layout for F3A zone controls -->
        <div class="slider-head">
            <span class="label">{label}</span>
            {#if readoutSlot}
                <slot name="readout" />
            {:else if showReadout}
                <div class="readout-inline">
                    <span
                        class="bearing"
                        title="Scroll to adjust by 0.1°"
                        on:wheel|preventDefault={handleWheel}
                        >{Number(value).toFixed(1)}°</span
                    >
                    <span
                        class="wheel-hint"
                        aria-hidden="true"
                        title="Use mouse wheel here">🖱️</span
                    >
                </div>
            {/if}
        </div>

        <input
            type="range"
            min="-180"
            max="180"
            step="0.1"
            bind:value
            {disabled}
        />

        {#if showStepButtons}
            <div class="button-group">
                <button type="button" on:click={() => handleStep(stepSize)}>
                    +{stepSize}° ⟲
                </button>
                <button type="button" class="ghost" on:click={handleReset}>
                    Reset
                </button>
            </div>
        {/if}
    {/if}
</div>

<style>
    .rotation-slider {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .rotation-slider.horizontal {
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
    }

    .rotation-slider[disabled] input[type="range"] {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .slider-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }

    .label {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #8da0ab;
        font-size: 0.7rem;
        font-weight: 700;
    }

    .readout-inline {
        display: flex;
        align-items: center;
        gap: 4px;
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

    .rotation-slider.horizontal input[type="range"] {
        width: 280px;
        flex: 0 0 280px;
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

    .button-group {
        display: flex;
        gap: 8px;
    }

    .bearing {
        min-width: 52px;
        text-align: right;
        font-family: "Space Mono", monospace;
        color: #9de44d;
    }

    .wheel-hint {
        font-size: 0.9rem;
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
