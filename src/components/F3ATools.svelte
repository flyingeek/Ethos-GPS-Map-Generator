<script>
    import { getContext } from "svelte";
    import { toDms } from "../lib/geoUtils.js";
    import RotationSlider from "./RotationSlider.svelte";

    const state = getContext("app");
    const f3aDefaultColor = "#ffffff";

    let { onsethome = null } = $props();

    // sethome still needs App.svelte (requires map.getCenter)

    function handleToggleF3A() {
        if (!state.isF3AZoneVisible) {
            // Sync f3aRotation to current map rotation before showing zone
            state.f3aRotation = state.rotation;
        }
        state.toggleF3A();
    }

    function handleResetF3ARotation() {
        state.f3aRotation = state.rotation;
    }
</script>

<section class="home-panel" class:with-f3a={state.homePosition}>
    <h2>Reference Position</h2>
    {#if state.homePosition}
        <p class="home-coords">
            🔒 {toDms(state.homePosition.lat, true)}, {toDms(
                state.homePosition.lng,
                false,
            )}
        </p>
    {:else}
        <p>
            Lock the crosshair to the current center and keep it pinned while
            moving the map.
        </p>
    {/if}
    <div class="home-actions">
        {#if state.homePosition}
            <button class="warn" onclick={() => state.clearHomePosition()}
                >Clear Reference</button
            >
        {:else}
            <button class="ok" onclick={() => onsethome?.()}
                >Set Reference Position</button
            >
        {/if}
    </div>
</section>

{#if state.homePosition}
    <section class="f3a-panel">
        <div class="f3a-title-row">
            <h2>F3A Zone</h2>
            {#if state.runwayDirs}
                <span class="runway-perp-indicator">
                    <span class="rpi-sym">⊥</span>
                    <span class="rpi-val">{state.runwayDirs.topLabel}</span>
                    <span class="rpi-line"></span>
                    <span class="rpi-sym">⊤</span>
                    <span class="rpi-val">{state.runwayDirs.bottomLabel}</span>
                </span>
            {/if}
        </div>
        <p>
            Draw a 120° triangle from the reference position with the base
            centered {Math.max(1, Number(state.f3aBaseDistance) || 150).toFixed(
                0,
            )}m away.
        </p>
        <div class="home-actions">
            <button
                class={state.isF3AZoneVisible ? "warn" : "ok"}
                onclick={handleToggleF3A}
                >{state.isF3AZoneVisible ? "Remove Zone" : "Show Zone"}</button
            >
        </div>
        <label class="field zone-rotation-field">
            <RotationSlider
                label="Rotation"
                bind:value={state.f3aRotation}
                disabled={!state.isF3AZoneVisible}
                onReset={handleResetF3ARotation}
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
                    bind:value={state.f3aBaseDistance}
                />
            </label>
            <label class="field zone-field">
                <span>Zone Color</span>
                <div class="color-row">
                    <input type="color" bind:value={state.f3aColor} />
                    {#if state.f3aColor !== f3aDefaultColor}
                        <button
                            class="reset-color"
                            onclick={() => (state.f3aColor = f3aDefaultColor)}
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
</style>
