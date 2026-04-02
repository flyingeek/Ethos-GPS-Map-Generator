<script>
    import { createEventDispatcher, onMount } from "svelte";
    import { parseLuaProject } from "../lib/exportBlobs.js";

    export let projectState;

    const dispatch = createEventDispatcher();
    const MAX_SAVED_PROJECTS = 10;

    let savedProjects = [];
    let selectedSaveIndex = -1;
    let saveNotice = "";
    let saveNoticeTimer = null;
    let isDragOver = false;

    onMount(() => {
        loadProjectsFromStorage();

        return () => {
            if (saveNoticeTimer) {
                clearTimeout(saveNoticeTimer);
            }
        };
    });

    function loadProjectsFromStorage() {
        try {
            const raw = localStorage.getItem("ethos-gps-projects");
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    savedProjects = parsed.slice(0, MAX_SAVED_PROJECTS);
                }
            }
        } catch {
            savedProjects = [];
        }
    }

    function persistProjects() {
        try {
            localStorage.setItem(
                "ethos-gps-projects",
                JSON.stringify(savedProjects),
            );
        } catch {
            // storage full or unavailable
        }
    }

    function saveProject() {
        const name = projectState.mapTitle.trim() || "EthosMap";
        const snapshot = {
            name,
            savedAt: new Date().toISOString(),
            mapTitle: projectState.mapTitle,
            resolution: projectState.resolution,
            customW: projectState.customW,
            customH: projectState.customH,
            mapType: projectState.mapType,
            zoomLock: projectState.zoomLock,
            rotation: projectState.rotation,
            center: {
                lat: projectState.center.lat,
                lng: projectState.center.lng,
            },
            zoom: projectState.zoom,
            homePosition: projectState.homePosition
                ? {
                      lat: projectState.homePosition.lat,
                      lng: projectState.homePosition.lng,
                  }
                : null,
            f3aZoneVisible: Boolean(projectState.f3aZoneVisible),
            f3aRotation: Number(projectState.f3aRotation) || 0,
            f3aBaseDistance: Math.max(
                1,
                Number(projectState.f3aBaseDistance) || 150,
            ),
        };

        const existingIndex = savedProjects.findIndex((p) => p.name === name);
        if (existingIndex >= 0) {
            savedProjects[existingIndex] = snapshot;
            savedProjects = [...savedProjects];
            selectedSaveIndex = existingIndex;
        } else if (savedProjects.length < MAX_SAVED_PROJECTS) {
            savedProjects = [...savedProjects, snapshot];
            selectedSaveIndex = savedProjects.length - 1;
        } else {
            // Max reached — replace the oldest entry
            savedProjects = [snapshot, ...savedProjects.slice(1)];
            selectedSaveIndex = 0;
        }

        persistProjects();

        saveNotice = `Saved: ${name}`;
        if (saveNoticeTimer) {
            clearTimeout(saveNoticeTimer);
        }
        saveNoticeTimer = setTimeout(() => {
            saveNotice = "";
            saveNoticeTimer = null;
        }, 1600);
    }

    function loadSelectedProject() {
        const project = savedProjects[selectedSaveIndex];
        if (!project) return;
        dispatch("loadproject", { project });
    }

    function deleteSavedProject() {
        if (selectedSaveIndex < 0) return;
        savedProjects = savedProjects.filter((_, i) => i !== selectedSaveIndex);
        selectedSaveIndex = -1;
        persistProjects();
    }

    function handleDragOver(event) {
        if (event.dataTransfer?.types?.includes("Files")) {
            event.preventDefault();
            isDragOver = true;
        }
    }

    function handleDragLeave(event) {
        // Only clear when leaving the drop zone itself, not a child element
        if (!event.currentTarget.contains(event.relatedTarget)) {
            isDragOver = false;
        }
    }

    async function handleDrop(event) {
        event.preventDefault();
        isDragOver = false;

        const file = [...(event.dataTransfer?.files ?? [])].find((f) =>
            f.name.toLowerCase().endsWith(".lua"),
        );
        if (!file) return;

        const text = await file.text();
        const project = parseLuaProject(text);

        if (!project) {
            saveNotice = "Invalid .lua file";
            if (saveNoticeTimer) clearTimeout(saveNoticeTimer);
            saveNoticeTimer = setTimeout(() => {
                saveNotice = "";
                saveNoticeTimer = null;
            }, 2200);
            return;
        }

        dispatch("loadproject", { project });
        saveNotice = `Imported: ${project.name}`;
        if (saveNoticeTimer) clearTimeout(saveNoticeTimer);
        saveNoticeTimer = setTimeout(() => {
            saveNotice = "";
            saveNoticeTimer = null;
        }, 1600);
    }
</script>

<div class="project-shelf">
    <span class="project-shelf-label">Projects</span>
    <select class="project-select" bind:value={selectedSaveIndex}>
        <option value={-1} disabled
            >{savedProjects.length === 0
                ? "No saved projects"
                : `${savedProjects.length}/${MAX_SAVED_PROJECTS} saved`}</option
        >
        {#each savedProjects as p, i}
            <option value={i}>{p.name}</option>
        {/each}
    </select>
    <div
        class="load-drop-zone"
        class:drag-over={isDragOver}
        role="button"
        tabindex="-1"
        on:dragover={handleDragOver}
        on:dragleave={handleDragLeave}
        on:drop={handleDrop}
    >
        <button
            class="ghost"
            disabled={selectedSaveIndex < 0}
            on:click={loadSelectedProject}
            title="Load selected project — or drop a .lua file here"
            >Load</button
        >
    </div>
    <button
        class="ghost del-btn"
        disabled={selectedSaveIndex < 0}
        on:click={deleteSavedProject}
        title="Delete selected project">🗑</button
    >
    <button class="ok" on:click={saveProject} title="Save current project"
        >Save</button
    >
    <span class={`save-notice ${saveNotice ? "visible" : ""}`}>
        {saveNotice || "Saved"}
    </span>
</div>

<style>
    .project-shelf {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
        position: relative;
        padding-bottom: 1.05rem;
    }

    .project-shelf-label {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #8da0ab;
        font-size: 0.7rem;
        font-weight: 700;
    }

    .project-select,
    button {
        border: 1px solid #2f4b51;
        background: #0c171b;
        color: #eff6f2;
        border-radius: 7px;
        padding: 8px 10px;
        font: inherit;
        min-height: 38px;
    }

    .project-select {
        min-width: 160px;
        max-width: 220px;
    }

    button {
        cursor: pointer;
        font-weight: 700;
    }

    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    button.ok {
        background: linear-gradient(135deg, #7fb729, #4a8f26);
        border-color: #90db35;
        color: #092409;
    }

    button.ghost {
        background: transparent;
        border-color: #4a666f;
    }

    .del-btn {
        min-width: unset;
        padding: 8px 10px;
    }

    .load-drop-zone {
        display: contents;
    }

    .load-drop-zone.drag-over button {
        border-color: #7fb729;
        background: #131f0a;
        color: #a9e65c;
        box-shadow: 0 0 0 2px rgba(127, 183, 41, 0.35);
    }

    .save-notice {
        position: absolute;
        right: 0;
        bottom: 0;
        text-align: right;
        color: #a9e65c;
        font-size: 0.74rem;
        letter-spacing: 0.03em;
        font-family: "Space Mono", monospace;
        line-height: 1.2;
        opacity: 0;
        transition: opacity 120ms ease;
        pointer-events: none;
        white-space: nowrap;
    }

    .save-notice.visible {
        opacity: 1;
    }
</style>
