# Ethos GPS Map Generator — Sync Pro

[![Compatible with GPS AccuMap](https://img.shields.io/badge/Compatible%20with-GPS%20AccuMap-blue)](https://github.com/MartinovEm/Ethos-GPS-AccuMap)

> **Now fully compatible with [GPS AccuMap Lua Widget](https://github.com/MartinovEm/Ethos-GPS-AccuMap) — real-time GPS map for Ethos radios!**

The Ethos GPS Map Generator is a high-precision, web-based tool designed to create offline maps for **Ethos GPS widgets** — including the [GPS AccuMap Lua Widget](https://github.com/MartinovEm/Ethos-GPS-AccuMap) and the built-in Ethos GPS Map widget. It ensures your 16-bit BMP images and coordinate metadata are perfectly synced for real-time flying and telemetry. AI was used in the process of creation.

> [!IMPORTANT]
> **Sync Pro Status:** This tool uses the File System Access API. For the best experience, use **Chrome** or **Edge** to enable direct syncing to your Radio's SD card.
>
> ⚠️ **You can use the tool online without downloading** by visiting: [https://martinovem.github.io/Ethos-GPS-Map-Generator/](https://martinovem.github.io/Ethos-GPS-Map-Generator/)

<img width="1500" height="1062" alt="EthosMapGen" src="https://github.com/user-attachments/assets/030e5b8c-eb28-43f9-8658-ad437abddd45" />


---

## Features

* **Versatile Map Types**:
    * **Google Hybrid**: Combines high-resolution satellite imagery with road and landmark labels for better orientation.
    * **Satellite Only**: Pure aerial photography for a clean look at the runway and flight line.
    * **Terrain**: Highlights physical features and elevation, useful for slope soaring and mountain flying sites.
* **Synchronized File Naming**: The tool automatically ensures that the metadata file and the image file share the **exact same prefix**. This is critical for both GPS AccuMap and the built-in Ethos GPS Map widget to recognize and pair the data with the correct image.
* **Offline Field Mobility**: By saving the metadata directly onto the radio, you can switch between different maps and instantly view the coordinates and boundaries of the new map — especially useful for GPS AccuMap, which reads them automatically.
* **Streamlined Export**:
    * **⚡ Sync To SD**: One-click sync of the 16-bit BMP, JSON coordinates, and metadata directly to your radio's SD card folders. If no SD card is linked, it automatically prompts you to connect one.
    * **📦 Download ZIP**: Downloads all three files (BMP, JSON, metadata) bundled in a ZIP for manual placement on the radio.
* **Precision Telemetry Engine**: Automatically generates coordinate metadata with high-accuracy decimal and DMS (Degrees, Minutes, Seconds) boundaries. GPS AccuMap reads these automatically; the built-in Ethos GPS Map widget requires manual entry.
* **Adaptive Resolution System**:
    * **Presets**: Quick-toggle options for standard full-screen radio resolutions (800x480 for most of X20/X18 series, and 480x320 for some of X18).
    * **Custom Engine**: Support for specific widget dimensions with a built-in helper link to the [Ethos Widget Size Check Lua](https://github.com/MartinovEm/Ethos-Widget-Size-Check) for users unsure of their layout pixels.
* **Sync Pro UI**: A professional dark-mode interface optimized for field use, featuring a live precision crosshair, high-visibility telemetry HUD, and a scale bar.
* **Hardware Integration**: Native support for the **Web FileSystem API** via the "Link SD Card" button, allowing you to sync files directly to your radio's folders without manual drag-and-drop.
* **HUD Tools**:
    * **Measurement Tool**: Click **📏 Measure** button to measure distances (meters/feet) directly on the map.
    * **Zoom Lock**: Secure your view to prevent accidental scaling while preparing for export.

---

## How to Use

### 1. To use this tool from the repository:
1. **Download**: Click the green **Code** button at the top of this page and select **Download ZIP.**
2. **Extract**: Unzip the files to a folder on your computer.
3. **Install**: Open a terminal in the project folder and run `npm install`.
4. **Run (development)**: Start the app with `npm run dev`, then open the local URL shown in the terminal.
5. **Build (production)**: Use `npm run build` to generate the production files in `dist/`.
    * *Note: A Chromium-based browser (Chrome or Edge) is required for the "Link SD Card" feature to function.*

**Or use it online:** [https://martinovem.github.io/Ethos-GPS-Map-Generator/](https://martinovem.github.io/Ethos-GPS-Map-Generator/)

### 2. Locate Your Flying Site
* **Search**: Use the search box in the top-left of the map to find your location by name or coordinates.
* **Map Type**: Switch between **Google Hybrid**, **Satellite**, or **Terrain** views to best suit your visibility needs.
* **Navigation**: Use the mouse wheel to set your altitude (zoom). The tool initializes at **Zoom 12** for a broad overview.

### 3. Configure Resolution
* Select your radio model from the **Resolution** dropdown. **The presets in the list are for Fullscreen widget layout.**
* If using a different (or custom) layout, select **Custom** and enter your specific pixel width and height for the widget size you will be using. Also, you can use the provided [Ethos Widget Size Check Lua](https://github.com/MartinovEm/Ethos-Widget-Size-Check) if you need to verify your screen space.
* GPS AccuMap supports any widget size and always renders the map at its native pixel resolution — no stretching or cropping distortion.

### 4. Precision Alignment
* Center the crosshair over the middle of your flying area.
* Use the **Rotation** slider (or +/- step buttons) to rotate the map and align runway orientation.
* Once positioned, check the **Zoom Lock** box to freeze the scale.
* (Optional) Use the **📏 Measure** tool to verify the flight area boundaries.

### 5. Direct Sync & Export to your Radio (SD Card)

When you export a map, the generator produces the following files:

| File | Location on SD Card | For Widget | Purpose |
|---|---|---|---|
| `ProjectName.bmp` | `/bitmaps/GPS/` | Both | The map image (16-bit BMP for Ethos radios) |
| `ProjectName.json` | `/documents/user/` | **GPS AccuMap** | Map boundaries — **loaded automatically** by GPS AccuMap |
| `_metadata.txt` | `/documents/user/` | Ethos GPS Map | Coordinates for the built-in widget — **must be entered manually** |

**For [GPS AccuMap](https://github.com/MartinovEm/Ethos-GPS-AccuMap):**
- Just select your map in the widget — coordinates are loaded automatically from the JSON file. No manual entry needed!

**For Ethos GPS Map widget:**
- You must open `_metadata.txt` and **manually** enter the North, South, East, and West coordinates into the widget settings.

* **Link SD Card**: Connect your radio via USB (Storage Mode). Click **🔗 Link SD Card** and select the root of your radio's SD drive.
* **Sync To SD**: Click the **⚡ Sync To SD** button. This will generate and save the 16-bit BMP, JSON coordinates, and metadata in one click.
    * If linked, files are sent to `/bitmaps/GPS` and `/documents/user` — no manual file management needed.
    * If not linked, the tool automatically prompts you to select the SD card first.
* **Download ZIP**: Click the **📦 Download ZIP** button to download all three files in a single ZIP archive. Manually place the BMP in `RADIO:/bitmaps/GPS/` and the JSON + metadata in `RADIO:/documents/user/`.

**Radio/SD card linking:**

<img width="1496" height="1062" alt="LinkSDCard" src="https://github.com/user-attachments/assets/c6adb327-17db-4dd0-b9f2-0dc3d7d74067" />


---

### The Metadata Files

#### For [GPS AccuMap](https://github.com/MartinovEm/Ethos-GPS-AccuMap):
* The `.json` file is all you need. The widget reads map boundaries and coordinates **automatically** — no manual entry, no risk of errors. Just select your map and fly.

#### For Ethos GPS Map widget:
* **Purpose:** The `_metadata.txt` file is your "Cheat Sheet" for the radio settings.
* **Use on PC:** Open this file on your PC and keep it visible while you are on your Radio's **GPS Map Widget Settings page.** **Manually** enter the **DMS (Degrees, Minutes, Seconds)** values into the corresponding North, South, East, and West fields in the widget.

#### Setting coordinates in the built-in GPS Map Widget:

![Coordinates_Ethos](https://github.com/user-attachments/assets/35171816-a20f-4991-b2a8-8ef600715bb8)

#### OR

* **Use on the radio:** Look at the metadata file in `RADIO:/documents/user` and **manually** enter the coordinates in the corresponding fields in the widget settings.

![File manager](https://github.com/user-attachments/assets/14256bb3-ecc8-41fa-9f13-2e8cc469b153)

![TXT document reading from the radio](https://github.com/user-attachments/assets/ee8009ff-7dd1-4cce-8790-ab8a2c7e3ae2)

---

### Final Verification Checklist

* **Sync:** Ensure the `.bmp` is in `/bitmaps/GPS/` and the `.json` (for GPS AccuMap) or `_metadata.txt` (for the built-in widget) is in `/documents/user/`.
* **Widget:**
    * For GPS AccuMap: Just select your map — coordinates are loaded automatically.
    * For Ethos GPS Map: **Manually** enter the N, S, E and W coordinates from `_metadata.txt` as shown in the picture above.
* **Accuracy:** If your "Home" icon doesn't match your physical location, double-check that you didn't swap the North/South or East/West values when typing them into the radio (manual entry only needed for the built-in widget).

#### Example of accuracy:

![Map_accuracy](https://github.com/user-attachments/assets/5ec89c74-d227-4e19-910d-f94d4404befb)

---

### ⚠️ Important: Understanding the File Formats
When you export your files:

**The Map Image (.bmp)**

* **On the Radio:** The 16-bit BMP will look perfect, crisp, and colorful on your Ethos screen (for both widgets).
* **On Desktop/PC:** The 16-bit BMP now uses a spec-compliant **BI_BITFIELDS** header with proper RGB565 color masks, so it displays correctly on both the radio and desktop viewers.

**Metadata Files:**
* **`.json`** — Used by GPS AccuMap for **automatic** coordinate loading.
* **`_metadata.txt`** — Used by the built-in Ethos GPS Map widget — coordinates must be entered **manually**.

---

### ⚠️ Important II: Full Screen vs. Top/Bottom bar screen size
Do not confuse Full Screen widget with the one that has top/bottom bars, despite in **New Screen** menu they look the same. Only the one labeled Full Screen has true full screen widget size. GPS AccuMap supports any widget size regardless.

<img width="1431" height="512" alt="fullscreen" src="https://github.com/user-attachments/assets/10c56d28-9fdc-4a17-83c9-b7d89186e164" />

---
