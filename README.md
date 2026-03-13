# 🛰️ Ethos GPS Map Generator — Sync Pro

The Ethos GPS Map Generator is a high-precision, web-based tool designed specifically for the FrSky ETHOS community. It simplifies the process of creating custom map backgrounds for the GPS telemetry widget. AI was used in the process of creation.

> [!IMPORTANT]
> **Sync Pro Status:** This tool uses the File System Access API. For the best experience, use **Chrome** or **Edge** to enable direct syncing to your Radio's SD card.

<img width="803" height="570" alt="Image" src="https://github.com/user-attachments/assets/93f17ab5-2d89-4e34-9cff-b345ec91f45c" />

---

### 🌟 Key Features

#### 🎯 Navigation & Precision
* **Integrated Search Box:** Powered by the Leaflet Geocoder, allowing pilots to find any flying field or RC club globally by name or address.
* **Live Mouse Telemetry:** Displays precision latitude and longitude coordinates in real-time as you move the mouse over the map for pinpoint location checks.
* **Center Crosshair:** Provides a permanent visual reference for the exact center of your map, making framing effortless.
* **📏 HUD Measurement Tool:** A "Google Maps" style distance tool. Center the crosshair on your start point, hit **Measure**, and watch real-time Metric and Imperial distances follow the crosshair as you pan the map.

#### 🔒 Control & Framing
* **Hardware-Specific Resolutions:** One-click toggles for **800x480** (Tandem X20, some X18) and **480x320** (X18) to ensure the map fills the radio screen perfectly.
* **Precision Zoom Lock:** A specialized safety feature that freezes the map scale. This allows you to pan and center your field without accidentally changing the zoom level, keeping your metadata accurate.
* **🖱️ Precision UX:** **Right-click** anywhere on the map to instantly cancel measurement mode and return to standard navigation.

#### 🗺️ Visual Customization
* **Triple Map Layers:** Choose between Google Hybrid (Satellite with labels), Satellite Only (Clean photo), or Terrain (Topographic contours).
* **High-Contrast UI:** Designed with a dark "Stealth" theme to make map details pop and reduce glare during outdoor use.

#### 💾 Intelligent Export System (Sync Pro)
* **⚡ Direct SD Sync:** Link your Radio's SD card directly via the browser. Save generated .bmp files straight to /bitmaps/GPS and the generated _metadata.txt file to /documents/user with a single click on **Extract all** button.
* **Smart File Naming:** Automatically generates filenames to keep your library organized. Directly exported .bmp files contain the Project Title only (up to 11 characters) for easy recognition by Ethos, while the _metadata.txt file includes the Project Title, Zoom Scale, and a Timestamp.
* **Optimized Metadata:** Pre-calculated with the specific coordinate alignment required by ETHOS, providing both DMS (Degrees, Minutes, Seconds) and Decimal formats.

---

### 🛰️ Metadata Structure

The generated _metadata.txt is structured for the following requirement:
* **DMS Coordinates:** Degrees, Minutes, Seconds for manual entry. It is **MANDATORY** to enter these when configuring the GPS map widget.
* **Decimal Geodata:** Precisely formatted North/South/West/East values for reference.
* **Resolution & Zoom:** Captured data ensuring the image scales correctly on the radio hardware.

---

### 📖 How to Use

1.  **Launch:** Open `index.html` in a Chrome or Edge browser.
2.  **Link (Recommended):** Click **🔗 Link SD Card** and select the root folder of your Radio's SD card. Grant the browser "View and Edit" permissions.
3.  **Locate:** Use the **SEARCH** box to find your flying site.
4.  **Measure (not mandatory):** Align the crosshair with the start of your runway, click **📏 Measure**, then drag the map to the end point to verify runway length in the HUD. **Right-click** anywhere on the map to clear.
5.  **Frame & Lock:** Adjust zoom until your area is centered, then check the **Zoom Lock** box and enter your **Project Title**.
6.  **Download/Sync:**
    * Click **⚡ Extract All** to sync the 16-bit BMP and Metadata directly to your radio folders.
    * Alternatively, use **💾 Suite** for a 24-bit source image.
7.  **Use coordinates** from _metadata.txt file when setting the corresponding bitmap image in GPS Map Widget. This .txt file will be created and included in the /documents/user foder of your radio (SD card) when using Direct download, or on your Brouwser's download directory when using Suite download.
8.  **Finalize (when exported via Suite-button):**
    * Open **Ethos Suite** and use the **Image Manager** to transcode the BMP to the radio's native 16-bit format.
    * Use the values in the generated `_metadata.txt` to configure your GPS widget fields on the radio.

---

### ⚠️ Important: Understanding the File Formats
When you export your files, you will notice differences in how they appear depending on where you open them:

**🗺️ The Map Image (.bmp)**

* **On the Radio:** If you used **Direct (16-bit)**, the map will look perfect, crisp, and colorful on your Ethos screen.

* **On Desktop/PC: Direct (16-bit)**: Will likely look like a **"Green Storm"** or have strange purple/green distortion. **This is normal**. Desktop photo viewers do not natively support the 16-bit R5-G6-B5 format used by FrSky hardware. Do not try to "fix" the colors on your PC; it is already perfect for your radio.

* **Suite (24-bit):** Will look like a normal satellite photo on your PC. Use this version only if you plan to process it through the Ethos Suite Image Manager.

**📄 The Metadata File (_metadata.txt)**

* **Purpose:** This is your "Cheat Sheet" for the radio settings.

* **How to Use:** Open this file on your PC and keep it visible while you are on your Radio's **GPS Widget Settings page.**

* **Entry:** Manually enter the **DMS (Degrees, Minutes, Seconds)** values into the corresponding North, South, East, and West fields in the widget.

**🛰️ Final Verification Checklist**

* **Sync:** Ensure the **.bmp is in /bitmaps/GPS** and the **.txt is in /documents/user.**

* **Widget:** Select your map in the GPS widget on the radio.

* **Accuracy:** If your "Home" icon doesn't match your physical location, double-check that you didn't swap the North/South or East/West values when typing them into the radio.
  
#### Setting coordinates in GPS Map Widget:

![Coordinates_Ethos](https://github.com/user-attachments/assets/35171816-a20f-4991-b2a8-8ef600715bb8)

#### Еxample of accuracy:

![Map_accuracy](https://github.com/user-attachments/assets/5ec89c74-d227-4e19-910d-f94d4404befb)

#### Metadata file reading from RADIO:/documents/user

![File manager](https://github.com/user-attachments/assets/14256bb3-ecc8-41fa-9f13-2e8cc469b153)

![TXT document reading from the radio](https://github.com/user-attachments/assets/ee8009ff-7dd1-4cce-8790-ab8a2c7e3ae2)

#### An example of the "Green Storm" overlay in a 16-bit BMP file (a Direct export of the map image intended for use in the radio), loaded onto the desktop::

<img width="784" height="480" alt="Image" src="https://github.com/user-attachments/assets/4bb7b0d8-810c-4eae-ae5b-1290fba7fc29" />
