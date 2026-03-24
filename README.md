
# Ethos GPS Map Generator — Sync Pro

[![Compatible with GPS AccuMap](https://img.shields.io/badge/Compatible%20with-GPS%20AccuMap-blue)](https://github.com/MartinovEm/Ethos-GPS-AccuMap)

> **Now fully compatible with [GPS AccuMap Lua Widget](https://github.com/MartinovEm/Ethos-GPS-AccuMap) — real-time GPS map for Ethos radios!**


The Ethos GPS Map Generator is a high-precision, web-based tool designed to create offline maps for **Ethos GPS widgets** — including the new [GPS AccuMap Lua Widget](https://github.com/MartinovEm/Ethos-GPS-AccuMap) and the built-in Ethos GPS Map widget. It ensures your 16-bit BMP images and coordinate metadata are perfectly synced for real-time flying and telemetry. AI was used in the process of creation.


> [!IMPORTANT]
> **Sync Pro Status:** This tool uses the File System Access API. For the best experience, use **Chrome** or **Edge** to enable direct syncing to your Radio's SD card.
>
> ⚠️ **You can use the tool online without downloading** by visiting: [https://martinovem.github.io/Ethos-GPS-Map-Generator/](https://martinovem.github.io/Ethos-GPS-Map-Generator/)


<img width="815" height="575" alt="Image" src="https://github.com/user-attachments/assets/b7bd16db-99e8-46d8-b7e8-225e4e18de3d" />
### 6. Suite Export Option
* When exported via **Suite** button, 24-bit BMP files are downloaded for further processing in Ethos Suite. After conversion, place the BMP in `/bitmaps/GPS/`.
* For GPS AccuMap, the JSON file is still used for automatic coordinate loading. For the built-in widget, use `_metadata.txt` for manual entry.

<img width="994" height="563" alt="Image" src="https://github.com/user-attachments/assets/49a95f9d-99d5-42c5-b300-1bb0f3f4f32a" />
### Final Verification Checklist

* **Sync:** Ensure the `.bmp` is in `/bitmaps/GPS/` and the `.json` (for GPS AccuMap) or `_metadata.txt` (for Ethos GPS Map) is in `/documents/user/`.
* **Widget:**
    * For GPS AccuMap: Just select your map — coordinates are loaded automatically.
    * For Ethos GPS Map: Enter the N, S, E, and W coordinates from `_metadata.txt` manually.
* **Accuracy:** If your "Home" icon doesn't match your physical location, double-check your coordinate entry (manual entry only needed for the built-in widget).

![Map_accuracy](https://github.com/user-attachments/assets/5ec89c74-d227-4e19-910d-f94d4404befb)
### About the Exported Metadata Files

**For GPS AccuMap:**
- The `.json` file is all you need! The widget reads map boundaries and coordinates automatically. No manual entry, no risk of errors — just select your map and fly.

**For Ethos GPS Map widget:**
- You must open `_metadata.txt` and manually enter the DMS (Degrees, Minutes, Seconds) values into the widget settings. This step is required every time you add a new map.

> **Tip:** If you want the fastest, most error-free setup, use [GPS AccuMap Lua Widget](https://github.com/MartinovEm/Ethos-GPS-AccuMap) — it was designed to work seamlessly with this generator.

![Coordinates_Ethos](https://github.com/user-attachments/assets/35171816-a20f-4991-b2a8-8ef600715bb8)

![File manager](https://github.com/user-attachments/assets/14256bb3-ecc8-41fa-9f13-2e8cc469b153)

![TXT document reading from the radio](https://github.com/user-attachments/assets/ee8009ff-7dd1-4cce-8790-ab8a2c7e3ae2)
### ⚠️ Important: Understanding the File Formats
When you export your files, you will notice differences in how they appear depending on where you open them:

**The Map Image (.bmp)**

* **On the Radio:** If you used **Direct (16-bit)**, the map will look perfect on your Ethos screen (for both widgets).
* **On Desktop/PC:** 16-bit BMPs may look distorted — this is normal. 24-bit BMPs (Suite export) look correct on PC.

**Metadata Files:**
* **.json** — Used by GPS AccuMap for automatic coordinate loading.
* **_metadata.txt** — Used by Ethos GPS Map widget for manual coordinate entry.

<img width="784" height="480" alt="Image" src="https://github.com/user-attachments/assets/4bb7b0d8-810c-4eae-ae5b-1290fba7fc29" />

### ⚠️ Important II: Full Screen vs. Top/Bottom bar screen size
For best results with GPS AccuMap, use the correct widget size. Full Screen widgets use the full resolution; top/bottom bar widgets are cropped. The generator supports both.

<img width="1431" height="512" alt="fullscreen" src="https://github.com/user-attachments/assets/10c56d28-9fdc-4a17-83c9-b7d89186e164" />

<img width="1431" height="512" alt="fullscreen" src="https://github.com/user-attachments/assets/10c56d28-9fdc-4a17-83c9-b7d89186e164" />

---


## Features — Designed for GPS AccuMap Compatibility

* **Versatile Map Types**: Google Hybrid, Satellite, and Terrain — for any flying field or widget layout.
* **Synchronized File Naming**: The tool ensures the exported map image and metadata file share the exact same prefix, so both GPS AccuMap and the built-in Ethos GPS Map widget can recognize and pair the data with the correct image.
* **Offline Field Mobility**: Save maps and metadata directly to your radio for instant field use — especially useful for GPS AccuMap, which reads map boundaries automatically.
* **Advanced Export Options**:
    * **💾 Direct**: Generates a 16-bit BMP for direct use on your Ethos radio (required for both widgets).
    * **💾 Suite**: Generates a 24-bit BMP for further processing in Ethos Suite.
    * **⚡ Extract All**: One-click export of both the BMP and metadata files, ready for use with GPS AccuMap or the Ethos GPS Map widget.
* **Precision Telemetry Engine**: Generates a metadata file with high-accuracy decimal and DMS coordinates. GPS AccuMap reads these automatically; the built-in widget requires manual entry.
* **Adaptive Resolution System**: Presets for common Ethos screen sizes and custom options for any widget layout.
* **Sync Pro UI**: Field-optimized, dark-mode interface with live crosshair, telemetry HUD, and scale bar.
* **Hardware Integration**: Native support for the Web FileSystem API for direct SD card sync.
* **HUD Tools**: Measurement and zoom lock for precise map setup.
 
---



## How to Use — Exporting for GPS AccuMap and Ethos GPS Map Widget


### 1. Download and Run
1. **Download**: Click the green **Code** button at the top of this page and select **Download ZIP.**
2. **Extract**: Unzip the files to a folder on your computer.
3. **Run**: Double-click `index.html` to open the generator in your web browser. *(Chrome or Edge required for SD card sync)*


### 2. Locate Your Flying Site
* **Search**: Find your field by name or coordinates.
* **Map Type**: Choose the best view for your needs.
* **Navigation**: Set your zoom level for optimal export.


### 3. Configure Resolution
* Select your radio model or enter custom widget size. GPS AccuMap supports any widget size and always renders the map at native resolution.


### 4. Precision Alignment
* Center the crosshair over your flying area and lock the zoom for pixel-perfect map export.


### 5. Export: File Types and Widget Compatibility

When you export a map, the generator produces:

| File                | Location on SD Card      | For Widget         | Purpose                                                                 |
|---------------------|-------------------------|--------------------|-------------------------------------------------------------------------|
| `ProjectName.bmp`   | `/bitmaps/GPS/`         | Both               | The map image (16-bit BMP for Ethos radios)                             |
| `ProjectName.json`  | `/documents/user/`      | GPS AccuMap        | **(Recommended)** Map boundaries for GPS AccuMap — read automatically   |
| `_metadata.txt`     | `/documents/user/`      | Ethos GPS Map      | For the built-in widget — must be entered manually                      |

**For GPS AccuMap:**
- Just select your map in the widget — coordinates are loaded automatically from the JSON file. No manual entry needed!

**For Ethos GPS Map widget:**
- You must open `_metadata.txt` and manually enter the North, South, East, and West coordinates into the widget settings.

**Export steps:**
- **Link SD Card**: Connect your radio via USB (Storage Mode). Click **🔗 Link SD Card** and select the root of your radio's SD drive.
- **Extract All**: Click the **⚡ Extract All** button to generate and save both the BMP and metadata files in one click.
- **Manual Export**: Use the individual export buttons for specific needs.


### 6. Suite Export Option
* When exported via **Suite** button, 24-bit BMP files are downloaded for further processing in Ethos Suite. After conversion, place the BMP in `/bitmaps/GPS/`.
* For GPS AccuMap, the JSON file is still used for automatic coordinate loading. For the built-in widget, use `_metadata.txt` for manual entry.

<img width="994" height="563" alt="Image" src="https://github.com/user-attachments/assets/49a95f9d-99d5-42c5-b300-1bb0f3f4f32a" />

---


### About the Exported Metadata Files

**For GPS AccuMap:**
- The `.json` file is all you need! The widget reads map boundaries and coordinates automatically. No manual entry, no risk of errors — just select your map and fly.

**For Ethos GPS Map widget:**
- You must open `_metadata.txt` and manually enter the DMS (Degrees, Minutes, Seconds) values into the widget settings. This step is required every time you add a new map.

> **Tip:** If you want the fastest, most error-free setup, use [GPS AccuMap Lua Widget](https://github.com/MartinovEm/Ethos-GPS-AccuMap) — it was designed to work seamlessly with this generator.


### Final Verification Checklist

* **Sync:** Ensure the `.bmp` is in `/bitmaps/GPS/` and the `.json` (for GPS AccuMap) or `_metadata.txt` (for Ethos GPS Map) is in `/documents/user/`.
* **Widget:**
    * For GPS AccuMap: Just select your map — coordinates are loaded automatically.
    * For Ethos GPS Map: Enter the N, S, E, and W coordinates from `_metadata.txt` manually.
* **Accuracy:** If your "Home" icon doesn't match your physical location, double-check your coordinate entry (manual entry only needed for the built-in widget).


### ⚠️ Important: Understanding the File Formats
When you export your files, you will notice differences in how they appear depending on where you open them:

**The Map Image (.bmp)**

* **On the Radio:** If you used **Direct (16-bit)**, the map will look perfect on your Ethos screen (for both widgets).
* **On Desktop/PC:** 16-bit BMPs may look distorted — this is normal. 24-bit BMPs (Suite export) look correct on PC.

**Metadata Files:**
* **.json** — Used by GPS AccuMap for automatic coordinate loading.
* **_metadata.txt** — Used by Ethos GPS Map widget for manual coordinate entry.


### ⚠️ Important II: Full Screen vs. Top/Bottom bar screen size
For best results with GPS AccuMap, use the correct widget size. Full Screen widgets use the full resolution; top/bottom bar widgets are cropped. The generator supports both.
