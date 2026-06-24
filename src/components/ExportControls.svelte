<script>
    import { onMount } from "svelte";
    import {
        createExportArtifacts,
        downloadFile,
    } from "../lib/exportActions.js";
    import { cleanBaseName } from "../lib/exportBlobs.js";

    export let projectSnapshot = {};
    export let map = null;

    const SD_BITMAPS_PATH = "";
    const SD_METADATA_PATH = "";

    let sdHandle = null;
    let isSdLinked = false;
    let syncMessage = "Export to folder";
    export let supportsSdSync = false;

    onMount(() => {
        supportsSdSync = typeof window.showDirectoryPicker === "function";

        const watchdog = setInterval(async () => {
            if (!sdHandle) {
                isSdLinked = false;
                return;
            }
            try {
                const iterator = sdHandle.entries();
                await iterator.next();
            } catch {
                sdHandle = null;
                isSdLinked = false;
            }
        }, 1800);

        return () => clearInterval(watchdog);
    });

    async function linkSdCard() {
        if (!supportsSdSync) return;
        try {
            sdHandle = await window.showDirectoryPicker();
            isSdLinked = true;
        } catch (error) {
            if (error?.name !== "AbortError") {
                sdHandle = null;
                isSdLinked = false;
            }
        }
    }

    async function saveToSd(blob, folderPath, fileName) {
        if (!sdHandle) return false;
        try {
            let currentHandle = sdHandle;
            const folders = folderPath.split("/").filter(Boolean);
            for (const folder of folders) {
                currentHandle = await currentHandle.getDirectoryHandle(folder, {
                    create: true,
                });
            }
            const fileHandle = await currentHandle.getFileHandle(fileName, {
                create: true,
            });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            return true;
        } catch {
            return false;
        }
    }

    async function handleDownloadZip() {
        const baseName = cleanBaseName(projectSnapshot.mapTitle);
        const { bmpBlob, luaBlob } = await createExportArtifacts({
            ...projectSnapshot,
            map,
            baseName,
        });

        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        zip.file(`${baseName}.bmp`, bmpBlob);
        zip.file(`${baseName}.lua`, luaBlob);

        const outBlob = await zip.generateAsync({ type: "blob" });
        downloadFile(outBlob, `${baseName}.zip`);
    }

    async function handleSync() {
        if (!supportsSdSync) return;
        if (!sdHandle) {
            await linkSdCard();
        }
        if (!sdHandle) return;

        const baseName = cleanBaseName(projectSnapshot.mapTitle);

        syncMessage = "Syncing...";
        const { bmpBlob, luaBlob } = await createExportArtifacts({
            ...projectSnapshot,
            map,
            baseName,
        });

        const bmpOk = await saveToSd(
            bmpBlob,
            SD_BITMAPS_PATH,
            `${baseName}.bmp`,
        );
        const luaOk = await saveToSd(
            luaBlob,
            SD_METADATA_PATH,
            `${baseName}.lua`,
        );

        syncMessage = bmpOk && luaOk ? "Saved!" : "Save Failed";
        setTimeout(() => {
            syncMessage = "Export to folder";
        }, 1800);
    }
</script>

<div class="action-controls">
    {#if supportsSdSync}
        <div class="sync-group">
            <button class="ok" on:click={handleSync}>{syncMessage}</button>
            {#if isSdLinked && sdHandle}
                <button
                    type="button"
                    class="sd-status-link"
                    on:click={linkSdCard}
                    title="Change the folder to save to"
                >
                    📁 {sdHandle.name} (change)
                </button>
            {/if}
        </div>
    {/if}
    <button class="ghost" on:click={handleDownloadZip}>Download ZIP</button>
</div>

<style>
    .action-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .sync-group {
        position: relative;
    }

    .sync-group > .ok {
        width: 130px;
    }

    .sd-status-link {
        position: absolute;
        top: calc(100% + 3px);
        left: 0;
        padding: 0 0 0 10px;
        border: 0;
        min-height: 0;
        background: transparent;
        color: #a2b4bc;
        font-family: "Space Mono", monospace;
        font-size: 0.72rem;
        font-weight: 400;
        letter-spacing: 0.02em;
        text-decoration: underline;
        text-underline-offset: 2px;
        cursor: pointer;
        white-space: nowrap;
    }

    .sd-status-link:hover {
        color: #c2d2d9;
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

    button.ok {
        background: linear-gradient(135deg, #7fb729, #4a8f26);
        border-color: #90db35;
        color: #092409;
    }

    button.ghost {
        background: transparent;
        border-color: #4a666f;
    }
</style>
