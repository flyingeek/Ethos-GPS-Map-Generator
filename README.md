# Ethos GPS Map Generator — Sync Pro

The Ethos GPS Map Generator is a high-precision, web-based tool designed to create high-precision offline maps for the **Ethos GPS Map Widget**. FrSky Ethos radios require specific image formats and coordinate metadata to display model positions accurately in real-time flying. This tool ensuring that your 16-bit BMP images and telemetry data are perfectly synced. AI was used in the process of creation.

> [!IMPORTANT]
> **Sync Pro Status:** This tool uses the File System Access API. For the best experience, use **Chrome** or **Edge** to enable direct syncing to your Radio's SD card.

<img width="815" height="575" alt="Image" src="https://github.com/user-attachments/assets/b7bd16db-99e8-46d8-b7e8-225e4e18de3d" />

---

## Features

* **Versatile Map Types**:
    * **Google Hybrid**: Combines high-resolution satellite imagery with road and landmark labels for better orientation.
    * **Satellite Only**: Pure aerial photography for a clean look at the runway and flight line.
    * **Terrain**: Highlights physical features and elevation, useful for slope soaring and mountain flying sites.
* **Synchronized File Naming**: The tool automatically ensures that the metadata file (`_metadata.txt`) and the image file (`.bmp`) share the **exact same prefix**. This is critical for the Ethos widget to recognize and pair the data with the correct image.
* **Offline Field Mobility**: By saving the metadata file directly onto the radio, you can switch between different maps (e.g., when changing flying fields) and instantly view the coordinates and boundaries of the new map directly on the radio screen without needing a computer or internet access.
* **Advanced Export Options**:
    * **💾 Direct**: Generates an optimized 16-bit BMP. This is the native format for Ethos radios, designed for direct use on the SD card.
    * **💾 Suite**: Generates a high-quality 24-bit BMP, ideal for users who prefer to process their images through the Ethos Suite desktop application.
    * **⚡ Extract All**: A one-click productivity feature that simultaneously generates and saves both the Metadata and the 16-bit Direct BMP on your radio (SDcard).
* **Precision Telemetry Engine**: Automatically generates a detailed `_metadata.txt` file containing high-accuracy decimal coordinates and DMS (Degrees, Minutes, Seconds) boundaries for perfect alignment.
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
3. **Run**: Simply double-click the `index.html` file to open the generator in your web browser. 
   * *Note: A Chromium-based browser (Chrome or Edge) is required for the "Link SD Card" feature to function.*

### 2. Locate Your Flying Site
* **Search**: Use the search box in the top-left of the map to find your location by name or coordinates.
* **Map Type**: Switch between **Google Hybrid**, **Satellite**, or **Terrain** views to best suit your visibility needs.
* **Navigation**: Use the mouse wheel to set your altitude (zoom). The tool initializes at **Zoom 12** for a broad overview.

### 3. Configure Resolution
* Select your radio model from the **Resolution** dropdown. **The presets in the list are for Fullscreen widget layout.**
* If using a different (or custom) layout, select **Custom** and enter your specific pixel width and height for the widget size you will be using. Also, you can use the provided [Ethos Widget Size Check Lua](https://github.com/MartinovEm/Ethos-Widget-Size-Check) if you need to verify your screen space.

### 4. Precision Alignment
* Center the crosshair over the middle of your flying area.
* Once positioned, check the **Zoom Lock** box to freeze the scale.
* (Optional) Use the **📏 Measure** tool to verify the flight area boundaries.

### 5. Direct Sync & Export to your Radio (SD Card)
* **Link SD Card**: Connect your radio via USB (Storage Mode). Click **🔗 Link SD Card** and select the root of your radio's SD drive.
* **Extract All**: Click the **⚡ Extract All** button. This will generate and save both the 16-bit BMP and the Metadata file in one click.
    * If linked, files are sent to `/bitmaps/GPS` and `/documents/user` and you will not even notice it. You don't need to move any files from one folder to another.
    * If not linked, the files will download to your browser's default downloads folder. You have to copy/paste them to the corresponding folders on your radio. BMP file goes to `/bitmaps/GPS` and _metadata.txt file goes to `/documents/user`.
* **Manual Export**: Use the individual **Meta**, **Direct** (16-bit), or **Suite** (24-bit) buttons for specific file needs (see **6. If exported via Suite-button** section just below that one).
    * If linked, files are sent to `/bitmaps/GPS` and `/documents/user` and you will not even notice it. You don't need to move any files from one folder to another.
    * If not linked, the files will download to your browser's default downloads folder. You have to copy/paste them to the corresponding folders on your radio. BMP file goes to `/bitmaps/GPS` and _metadata.txt file goes to `/documents/user`.

### 6. If exported via Suite-button:
* When exported via **Suite** button, 24-bit BMP files will always be downloaded to your browser's default downloads folder.
* Open **Ethos Suite** and use the **Image Manager** to transcode the BMP to the radio's native 16-bit format. Then place that file in `RADIO:/bitmaps/GPS`.
* Use the values in the generated `_metadata.txt` to configure your GPS widget fields on the radio.

**Radio/SD card linking:**

<img width="994" height="563" alt="Image" src="https://github.com/user-attachments/assets/49a95f9d-99d5-42c5-b300-1bb0f3f4f32a" />

---

### The Metadata File (_metadata.txt)

* **Purpose:** This is your "Cheat Sheet" for the radio settings.

* **Use on PC:** Open this file on your PC and keep it visible while you are on your Radio's **GPS Map Widget Settings page.** Manually enter the **DMS (Degrees, Minutes, Seconds)** values into the corresponding North, South, East, and West fields in the widget.

#### Setting coordinates in GPS Map Widget:

![Coordinates_Ethos](https://github.com/user-attachments/assets/35171816-a20f-4991-b2a8-8ef600715bb8)

#### OR

* **Use on the radio:** Look at the metadata file in RADIO:/documents/user and manually enter the coordinates in the corresponding fields in the widget settings.

![File manager](https://github.com/user-attachments/assets/14256bb3-ecc8-41fa-9f13-2e8cc469b153)

![TXT document reading from the radio](https://github.com/user-attachments/assets/ee8009ff-7dd1-4cce-8790-ab8a2c7e3ae2)

---

### Final Verification Checklist

* **Sync:** Ensure the **.bmp is in /bitmaps/GPS** and the **.txt is in /documents/user.**

* **Widget:** Select your map in the GPS widget on the radio. Ensure you entered the N, S, E and W coordinates from `_metadata.txt` file as shown in the picture above.

* **Accuracy:** If your "Home" icon doesn't match your physical location, double-check that you didn't swap the North/South or East/West values when typing them into the radio.

#### Еxample of accuracy:

![Map_accuracy](https://github.com/user-attachments/assets/5ec89c74-d227-4e19-910d-f94d4404befb)

---

### ⚠️ Important: Understanding the File Formats
When you export your files, you will notice differences in how they appear depending on where you open them:

**The Map Image (.bmp)**

* **On the Radio:** If you used **Direct (16-bit)**, the map will look perfect, crisp, and colorful on your Ethos screen.

* **On Desktop/PC: Direct (16-bit)**: Will likely look like a **"Green Storm"** or have strange purple/green distortion. **This is normal**. Desktop photo viewers do not natively support the 16-bit R5-G6-B5 format used by FrSky hardware. Do not try to "fix" the colors on your PC; it is already perfect for your radio.

* **Suite (24-bit):** Will look like a normal satellite photo on your PC. Use this version only if you plan to process it through the Ethos Suite Image Manager.


#### An example of the "Green Storm" overlay in a 16-bit BMP file (a Direct export of the map image intended for use in the radio), loaded onto the desktop::

<img width="784" height="480" alt="Image" src="https://github.com/user-attachments/assets/4bb7b0d8-810c-4eae-ae5b-1290fba7fc29" />

---

### ⚠️ Important: Full Screen vs. Top/Bottom bar screen size
Do not confuse Full Screen widget with the one that has top/bottom bars, despite in **New creen** menu they look the same. Only the one labeled Full Screen has true full screen widged size.

<img width="1431" height="512" alt="fullscreen" src="https://github.com/user-attachments/assets/10c56d28-9fdc-4a17-83c9-b7d89186e164" />

---
