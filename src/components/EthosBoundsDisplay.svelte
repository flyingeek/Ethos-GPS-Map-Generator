<script>
    import { toDms } from "../lib/geoUtils.js";

    /**
     * @typedef {Object} Props
     * @property {any} [bounds]
     * @property {number} [rotation]
     */

    /** @type {Props} */
    let { bounds = { north: 0, south: 0, west: 0, east: 0 }, rotation = 0 } = $props();

    const WIDGET_URL = "https://github.com/flyingeek/ethos-gps-tracker";
    const WIDGET_NAME = "GPS Tracker";

    let isBoundsOpen = $state(false);
</script>

<button
    class="bounds-info bounds-info-toggle"
    class:bounds-info-static={rotation !== 0}
    onclick={() => {
        if (rotation === 0) isBoundsOpen = !isBoundsOpen;
    }}
>
    <span>
        {#if rotation !== 0}
            ⓘ This map is only compatible with <a
                href={WIDGET_URL}
                target="_blank"
                rel="noopener noreferrer">{WIDGET_NAME}</a
            > widget. Ethos standard widget requires non rotated map.
        {:else}
            It's easier to use <a
                href={WIDGET_URL}
                target="_blank"
                rel="noopener noreferrer">{WIDGET_NAME}</a
            >. But click here to see the Ethos standard widget settings.
        {/if}
    </span>
    <span class="bounds-accordion-icon" class:hidden={rotation !== 0}
        >{isBoundsOpen ? "▲" : "▼"}</span
    >
</button>
{#if isBoundsOpen && rotation === 0}
    <div class="bounds-grid">
        <div class="bounds-header">
            <h3 class="bounds-title">Ethos GPS Map Widget Settings</h3>
            <span class="bounds-save-hint"
                >ⓘ map should be saved in the /bitmaps/gps folder</span
            >
        </div>
        <div class="bounds-latlon">
            <div class="bounds-row">
                <span class="bounds-label">Latitude</span>
                <div class="bounds-values">
                    <span class="bounds-val">{toDms(bounds.north, true)}</span>
                    <span class="bounds-sep">-</span>
                    <span class="bounds-val">{toDms(bounds.south, true)}</span>
                </div>
            </div>
            <div class="bounds-row">
                <span class="bounds-label">Longitude</span>
                <div class="bounds-values">
                    <span class="bounds-val">{toDms(bounds.east, false)}</span>
                    <span class="bounds-sep">-</span>
                    <span class="bounds-val">{toDms(bounds.west, false)}</span>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .bounds-grid {
        display: grid;
        gap: 0;
        background: rgba(4, 9, 12, 0.6);
        border: 1px solid #304750;
        border-radius: 8px;
        overflow: hidden;
        font-family: "Space Mono", monospace;
    }

    .bounds-latlon {
        max-width: 784px;
    }

    .bounds-title {
        margin: 0;
        padding: 7px 12px;
        font-size: 0.8rem;
        color: #96adbc;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .bounds-header {
        display: flex;
        align-items: center;
        border-bottom: 1px solid #304750;
    }

    .bounds-save-hint {
        font-family: "Space Mono", monospace;
        font-size: 0.75rem;
        color: #96adbc;
        padding: 7px 12px;
    }

    .bounds-info {
        margin: 0;
        padding: 8px 12px;
        color: #7ab8cc;
        font-family: "Space Mono", monospace;
        font-size: 0.75rem;
    }

    .bounds-info-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        width: 100%;
        text-align: left;
        background: none;
        border: none;
        border-radius: 0;
        color: #7ab8cc;
        cursor: pointer;
        font-family: "Space Mono", monospace;
        font-size: 0.75rem;
        padding: 8px 12px;
    }

    .bounds-info-toggle:hover:not(.bounds-info-static) {
        color: #a8d8eb;
        background: rgba(255, 255, 255, 0.04);
    }

    .bounds-info-static {
        cursor: default;
        color: #7ab8cc;
    }

    .bounds-accordion-icon.hidden {
        visibility: hidden;
    }

    .bounds-accordion-icon {
        font-size: 0.65rem;
        opacity: 0.7;
        flex-shrink: 0;
    }

    .bounds-row {
        display: flex;
        align-items: center;
        padding: 6px 12px;
        gap: 8px;
        border-top: 1px solid #1e3038;
    }

    .bounds-label {
        color: #d0dde4;
        font-size: 0.85rem;
        min-width: 80px;
        flex-shrink: 0;
    }

    .bounds-values {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 6px;
        margin-left: auto;
    }

    .bounds-val {
        background: #1a2830;
        border: 1px solid #2f4b51;
        border-radius: 4px;
        padding: 3px 8px;
        color: #e8f2ea;
        font-size: 0.8rem;
        white-space: nowrap;
        text-align: right;
        min-width: 18ch;
    }

    .bounds-sep {
        color: #6a8a96;
        font-size: 0.8rem;
    }
</style>
