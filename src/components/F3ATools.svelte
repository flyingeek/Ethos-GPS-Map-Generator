<script>
    import { createEventDispatcher } from "svelte";
    import { toDms } from "../lib/geoUtils.js";
    import RotationSlider from "./RotationSlider.svelte";

    export let homePosition = null;
    export let isF3AZoneVisible = false;
    export let f3aRotation = 0;
    export let f3aBaseDistance = 150;
    export let f3aColor = "#ffffff";
    export let runwayDirs = null;

    const f3aDefaultColor = "#ffffff";

    const dispatch = createEventDispatcher();
</script>

<section class="home-panel" class:with-f3a={homePosition}>
    <h2>Reference Position</h2>
    {#if homePosition}
        <p class="home-coords">
            🔒 {toDms(homePosition.lat, true)}, {toDms(homePosition.lng, false)}
        </p>
    {:else}
        <p>
            Lock the crosshair to the current center and keep it pinned while
            moving the map.
        </p>
    {/if}
    <div class="home-actions">
        {#if homePosition}
            <button class="warn" on:click={() => dispatch("clearhome")}
                >Clear Reference</button
            >
        {:else}
            <button class="ok" on:click={() => dispatch("sethome")}
                >Set Reference Position</button
            >
        {/if}
    </div>
</section>

{#if homePosition}
    <section class="f3a-panel">
        <div class="f3a-title-row">
            <h2>F3A Zone</h2>
            {#if runwayDirs}
                <span class="runway-perp-indicator">
                    <span class="rpi-sym">⊥</span>
                    <span class="rpi-val">{runwayDirs.topLabel}</span>
                    <span class="rpi-line"></span>
                    <span class="rpi-sym">⊤</span>
                    <span class="rpi-val">{runwayDirs.bottomLabel}</span>
                </span>
            {/if}
        </div>
        <p>
            Draw a 120° triangle from the reference position with the base
            centered {Math.max(1, Number(f3aBaseDistance) || 150).toFixed(0)}m
            away.
        </p>
        <div class="home-actions">
            <button
                class={isF3AZoneVisible ? "warn" : "ok"}
                on:click={() => dispatch("togglef3a")}
                >{isF3AZoneVisible ? "Remove Zone" : "Show Zone"}</button
            >
        </div>
        <label class="field zone-rotation-field">
            <RotationSlider
                label="Rotation"
                bind:value={f3aRotation}
                disabled={!isF3AZoneVisible}
                onReset={() => dispatch("resetf3arotation")}
                inlineLabel={false}
                horizontalSliderWidth={110}
                horizontalWrap={false}
                forceStepButtonsOnTouch={true}
                twoLineSteps={true}
            />
        </label>
        <div class="zone-dist-color-row">
            <label class="field zone-field">
                <span>Base Distance (m)</span>
                <input
                    type="number"
                    min="1"
                    step="1"
                    bind:value={f3aBaseDistance}
                />
            </label>
            <label class="field zone-field">
                <span>Zone Color</span>
                <div class="color-row">
                    <input type="color" bind:value={f3aColor} />
                    {#if f3aColor !== f3aDefaultColor}
                        <button
                            class="reset-color"
                            on:click={() => (f3aColor = f3aDefaultColor)}
                            >reset</button
                        >
                    {/if}
                </div>
            </label>
        </div>
    </section>
{/if}

<style>
    .home-panel {
        display: grid;
        gap: 8px;
        padding-bottom: 8px;
    }
    .home-panel.with-f3a {
        border-bottom: 1px solid #2e434a;
    }

    .home-panel h2,
    .f3a-panel h2 {
        margin: 0;
        color: #96d547;
        font-size: 1rem;
    }

    .home-panel p,
    .f3a-panel p {
        margin: 0;
        color: #cad4d9;
        font-size: 0.9rem;
    }

    .home-coords {
        color: #a9d66c;
        font-family: "Space Mono", monospace;
        font-size: 0.82rem;
        padding-bottom: 2px;
    }

    .home-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .f3a-panel {
        display: grid;
        gap: 8px;
    }

    .f3a-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .runway-perp-indicator {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: center;
        column-gap: 4px;
        row-gap: 2px;
        flex-shrink: 0;
        font-family: "Space Mono", monospace;
        font-size: 0.6rem;
        color: #9de44d;
        line-height: 1;
    }

    .rpi-sym {
        opacity: 0.7;
        font-size: 0.65rem;
        text-align: left;
    }

    .rpi-val {
        text-align: right;
        white-space: nowrap;
    }

    .rpi-line {
        grid-column: 1 / -1;
        height: 1px;
        border-top: 1px dashed rgba(157, 228, 77, 0.6);
    }

    .field {
        display: grid;
        gap: 4px;
        min-width: 170px;
    }

    .field > span {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #8da0ab;
        font-size: 0.7rem;
        font-weight: 700;
    }

    .zone-dist-color-row {
        display: flex;
        gap: 10px;
        align-items: flex-end;
        flex-wrap: nowrap;
    }

    .zone-dist-color-row .zone-field {
        min-width: 0;
        flex: 1 1 auto;
    }

    .zone-dist-color-row .zone-field:last-child {
        flex: 0 0 auto;
    }

    .zone-rotation-field {
        min-width: unset;
    }

    .color-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .reset-color {
        all: unset;
        color: #6a9cbc;
        font-family: "Space Mono", monospace;
        font-size: 0.65rem;
        text-decoration: underline;
        text-underline-offset: 2px;
        cursor: pointer;
    }

    .reset-color:hover {
        color: #a8cfe0;
    }

    input,
    button {
        border: 1px solid #2f4b51;
        background: #0c171b;
        color: #eff6f2;
        border-radius: 7px;
        padding: 8px 10px;
        font: inherit;
        min-height: 38px;
    }

    button {
        cursor: pointer;
        font-weight: 700;
    }

    button.ok {
        background: linear-gradient(135deg, #7fb729, #4a8f26);
        border-color: #90db35;
        color: #092409;
    }

    button.warn {
        background: linear-gradient(135deg, #d78931, #bc5f18);
        border-color: #f5a454;
        color: #fff9f0;
    }
</style>
