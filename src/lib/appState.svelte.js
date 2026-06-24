import { normalizeAngle } from "./geoUtils.js";
import {
    buildRunwayFromScreen,
    rotateRunway,
} from "./runwayUtils.js";

const f3aDefaultColor = "#ffffff";

function formatPerpLabel(bearing) {
    const val = bearing > 180 ? bearing - 360 : bearing;
    const abs = Number(Math.abs(val).toFixed(1));
    const dir = val > 0 ? "E" : val < 0 ? "W" : "";
    return `${abs}°${dir}`;
}

export class AppState {
    // ── Map settings ────────────────────────────────────────────────────────
    mapTitle = $state("CestasMap");
    resolution = $state("784,316");
    customW = $state(800);
    customH = $state(480);
    mapType = $state("y");
    zoomLock = $state(false);
    rotation = $state(42.5);

    // ── Home / F3A ───────────────────────────────────────────────────────────
    homePosition = $state({ lat: 44.714409685877825, lng: -0.7168534611050745 });
    isF3AZoneVisible = $state(true);
    f3aRotation = $state(42.5);
    f3aBaseDistance = $state(150);
    f3aColor = $state(f3aDefaultColor);

    // ── Runway ───────────────────────────────────────────────────────────────
    selectedRunway = $state(null);
    isRunwayPickActive = $state(false);
    isRunwayEditActive = $state(false);
    runwayPickStart = $state(null);
    runwayStatus = $state("Pick runway ends to define runway.");

    // ── Derived ──────────────────────────────────────────────────────────────
    mapWidth = $derived(
        this.resolution === "custom"
            ? Number(this.customW) || 800
            : Number(this.resolution.split(",")[0])
    );

    mapHeight = $derived(
        this.resolution === "custom"
            ? Number(this.customH) || 480
            : Number(this.resolution.split(",")[1])
    );

    runwayDirs = $derived.by(() => {
        if (!this.selectedRunway) return null;
        const screenAngle =
            (((this.selectedRunway.heading - this.rotation) % 360) + 360) % 360;
        const distFrom90 = Math.min(
            Math.abs(screenAngle - 90),
            Math.abs(screenAngle - 270),
        );
        void distFrom90; // used only for side-effect suppression in original
        const perp1 = (this.selectedRunway.heading + 90 + 360) % 360;
        const perp2 = (this.selectedRunway.heading - 90 + 360) % 360;
        const mapUp = ((this.rotation % 360) + 360) % 360;
        const diff1 = Math.min(
            Math.abs(perp1 - mapUp),
            360 - Math.abs(perp1 - mapUp),
        );
        const upPerp = diff1 <= 90 ? perp1 : perp2;
        const downPerp = diff1 <= 90 ? perp2 : perp1;
        return {
            topLabel: formatPerpLabel(upPerp),
            bottomLabel: formatPerpLabel(downPerp),
        };
    });

    // ── Home / F3A actions ───────────────────────────────────────────────────
    setHomePosition(lat, lng) {
        this.homePosition = { lat, lng };
    }

    clearHomePosition() {
        this.homePosition = null;
        this.isF3AZoneVisible = false;
    }

    toggleF3A() {
        if (!this.isF3AZoneVisible) {
            // rotation will be synced from map bearing by App.svelte before this,
            // but we also expose a setter so App can push the current bearing.
        }
        this.isF3AZoneVisible = !this.isF3AZoneVisible;
    }

    resetF3ARotation(bearing) {
        this.f3aRotation = bearing;
    }

    // ── Runway actions ───────────────────────────────────────────────────────
    updateSelectedRunway(runway, statusMessage) {
        this.selectedRunway = runway;
        this.runwayStatus = statusMessage;
    }

    rotateSelectedRunway(deltaDeg) {
        if (!this.selectedRunway) return;
        this.updateSelectedRunway(
            rotateRunway(this.selectedRunway, deltaDeg),
            `Runway axis rotated ${deltaDeg > 0 ? "+" : ""}${deltaDeg.toFixed(1)}°.`,
        );
    }

    startRunwayPick() {
        this.selectedRunway = null;
        this.runwayPickStart = null;
        this.isRunwayPickActive = true;
        this.runwayStatus = "Click one runway end, then the other.";
    }

    cancelRunwayPick() {
        this.isRunwayPickActive = false;
        this.runwayPickStart = null;
        this.runwayStatus = this.selectedRunway
            ? "Runway selected."
            : "Pick runway ends to define runway.";
    }

    clearRunwaySelection() {
        this.selectedRunway = null;
        this.runwayPickStart = null;
        this.isRunwayPickActive = false;
        this.isRunwayEditActive = false;
        this.runwayStatus = "Pick runway ends to define runway.";
    }

    stopRunwayEdit() {
        this.isRunwayEditActive = false;
    }

    toggleRunwayEdit() {
        this.isRunwayEditActive = !this.isRunwayEditActive;
    }

    // ── Project load ─────────────────────────────────────────────────────────
    loadProject(p) {
        this.mapTitle = p.mapTitle ?? p.name;
        this.resolution = p.resolution;
        this.customW = p.customW;
        this.customH = p.customH;
        this.mapType = p.mapType;
        this.zoomLock = p.zoomLock;
        this.rotation = p.rotation;
        this.homePosition = p.homePosition ?? null;
        this.f3aRotation =
            typeof p.f3aRotation === "number" && Number.isFinite(p.f3aRotation)
                ? p.f3aRotation
                : this.f3aRotation;
        this.f3aBaseDistance = Math.max(1, Number(p.f3aBaseDistance) || 150);
        this.f3aColor =
            typeof p.f3aColor === "string" &&
            /^#[0-9a-fA-F]{6}$/.test(p.f3aColor)
                ? p.f3aColor
                : f3aDefaultColor;
        this.isF3AZoneVisible =
            Boolean(p.f3aZoneVisible) && Boolean(this.homePosition);

        const r = p.selectedRunway;
        if (
            r?.start?.lat != null &&
            r?.start?.lng != null &&
            r?.end?.lat != null &&
            r?.end?.lng != null
        ) {
            this.selectedRunway = {
                source: r.source ?? "manual",
                confidence: 1,
                score: 1,
                stripWidth: r.stripWidth ?? 18,
                start: r.start,
                end: r.end,
                center: r.center,
                heading: r.heading,
                lengthM: r.lengthM,
            };
            this.runwayStatus = "Runway selected.";
        } else {
            this.selectedRunway = null;
            this.runwayStatus = "Pick runway ends to define runway.";
        }
    }

    // ── Serialise for save ───────────────────────────────────────────────────
    toSnapshot(center, zoom, bounds) {
        return {
            mapTitle: this.mapTitle,
            resolution: this.resolution,
            customW: this.customW,
            customH: this.customH,
            mapType: this.mapType,
            zoomLock: this.zoomLock,
            rotation: this.rotation,
            center,
            zoom,
            bounds,
            homePosition: this.homePosition,
            f3aZoneVisible: this.isF3AZoneVisible,
            f3aRotation: this.f3aRotation,
            f3aBaseDistance: this.f3aBaseDistance,
            f3aColor: this.f3aColor,
            selectedRunway: this.selectedRunway
                ? {
                      source: this.selectedRunway.source,
                      stripWidth: this.selectedRunway.stripWidth,
                      start: this.selectedRunway.start,
                      end: this.selectedRunway.end,
                      center: this.selectedRunway.center,
                      heading: this.selectedRunway.heading,
                      lengthM: this.selectedRunway.lengthM,
                  }
                : null,
        };
    }
}
