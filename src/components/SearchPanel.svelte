<script>
    export let map;
    export let mapWidth;

    let searchQuery = "";
    let searchBusy = false;
    let searchMessage = "";
    let searchResults = [];

    async function searchPlace() {
        const query = searchQuery.trim();
        if (!query || !map) return;

        searchBusy = true;
        searchMessage = "";
        searchResults = [];

        try {
            const endpoint = new URL(
                "https://nominatim.openstreetmap.org/search",
            );
            endpoint.searchParams.set("q", query);
            endpoint.searchParams.set("format", "jsonv2");
            endpoint.searchParams.set("limit", "5");

            const response = await fetch(endpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Search service unavailable.");
            }

            const results = await response.json();
            if (!Array.isArray(results) || results.length === 0) {
                searchMessage = "No place found.";
                return;
            }

            searchResults = results
                .map((item) => {
                    const lat = Number.parseFloat(item.lat);
                    const lon = Number.parseFloat(item.lon);
                    return {
                        display: item.display_name || "Unknown place",
                        lat,
                        lon,
                    };
                })
                .filter(
                    (item) =>
                        Number.isFinite(item.lat) && Number.isFinite(item.lon),
                )
                .slice(0, 5);

            if (searchResults.length === 0) {
                searchMessage = "Search returned invalid coordinates.";
                return;
            }

            searchMessage = `${searchResults.length} results found. Select one below.`;
        } catch (error) {
            searchMessage = "Search failed. Please try again.";
        } finally {
            searchBusy = false;
        }
    }

    function selectSearchResult(result) {
        if (!map) return;

        map.flyTo({
            center: [result.lon, result.lat],
            zoom: Math.max(map.getZoom(), 14),
            speed: 0.8,
        });

        searchMessage = result.display;
    }
</script>

<div class="search-panel" style={`width:${mapWidth}px;max-width:100%;`}>
    <div class="search-row">
        <label class="search-field">
            <span>Search Place (No API Key)</span>
            <input
                type="text"
                bind:value={searchQuery}
                placeholder="Airport, city or coordinates"
                on:keydown={(event) => {
                    if (event.key === "Enter") {
                        searchPlace();
                    }
                }}
            />
        </label>
        <button class="search-btn" on:click={searchPlace} disabled={searchBusy}
            >{searchBusy ? "Searching..." : "Search"}</button
        >
    </div>

    {#if searchMessage}
        <div class="search-status" title={searchMessage}>
            {searchMessage}
        </div>
    {/if}

    {#if searchResults.length > 0}
        <div class="search-results">
            {#each searchResults as result, index}
                <button
                    class="result-item"
                    type="button"
                    on:click={() => selectSearchResult(result)}
                    title={result.display}
                >
                    <span class="result-index">#{index + 1}</span>
                    <span class="result-label">{result.display}</span>
                </button>
            {/each}
        </div>
    {/if}
</div>

<style>
    .search-panel {
        background: linear-gradient(
            165deg,
            rgba(18, 28, 31, 0.92),
            rgba(8, 14, 18, 0.95)
        );
        border: 1px solid #3b5f31;
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 14px 40px rgba(0, 0, 0, 0.4);
        display: grid;
        gap: 8px;
    }

    .search-row {
        display: flex;
        gap: 8px;
        align-items: end;
        flex-wrap: wrap;
    }

    .search-field {
        display: grid;
        gap: 4px;
        min-width: 320px;
        flex: 1;
    }

    .search-field span {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #8da0ab;
        font-size: 0.7rem;
        font-weight: 700;
    }

    .search-field input,
    .search-btn {
        border: 1px solid #2f4b51;
        background: #0c171b;
        color: #eff6f2;
        border-radius: 7px;
        padding: 8px 10px;
        font: inherit;
        min-height: 38px;
    }

    .search-field input {
        width: 100%;
    }

    .search-btn {
        min-width: 110px;
        cursor: pointer;
        font-weight: 700;
        background: transparent;
        border-color: #4a666f;
    }

    .search-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .search-status {
        font-size: 0.78rem;
        color: #a9cf7d;
        font-family: "Space Mono", monospace;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .search-results {
        display: grid;
        gap: 6px;
    }

    .result-item {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 8px;
        align-items: center;
        text-align: left;
        background: rgba(13, 22, 27, 0.88);
        border: 1px solid #39545d;
        border-radius: 7px;
        color: #eff6f2;
        min-height: 34px;
        padding: 6px 8px;
        font: inherit;
        cursor: pointer;
    }

    .result-item:hover {
        border-color: #8acf35;
        background: rgba(21, 35, 41, 0.94);
    }

    .result-index {
        color: #91cd46;
        font-family: "Space Mono", monospace;
        font-size: 0.72rem;
        min-width: 24px;
    }

    .result-label {
        font-size: 0.8rem;
        color: #d7e2e8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    @media (max-width: 1024px) {
        .search-field {
            min-width: 100%;
        }
    }
</style>
