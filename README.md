# Ethos-GPS-Map-Generator
The Ethos GPS Map Generator is a high-precision, web-based utility designed specifically for the FrSky ETHOS community. It simplifies the process of creating custom map backgrounds for the GPS telemetry widget. AI was used in the process of creation.

🌟 **Key Features**

🎯 **Navigation & Precision**
**Integrated Search Box:** Powered by the Leaflet Geocoder, allowing pilots to find any flying field or RC club globally by name or address.

**Live Mouse Telemetry:** Displays precision latitude and longitude coordinates in real-time as you move the mouse over the map for pinpoint location checks.

**Center Crosshair:** Provides a permanent visual reference for the exact center of your map, making framing effortless.

🔒 **Control & Framing**
**Hardware-Specific Resolutions:** One-click toggles for 800x480 (Tandem X20 and some of X18 series) and 480x320 (X18 series) to ensure the map fills the radio screen perfectly.

**Precision Zoom Lock:** A specialized safety feature that freezes the map scale. This allows you to pan and center your field without accidentally changing the zoom level, keeping your metadata accurate.

🗺️ **Visual Customization**
**Triple Map Layers:** Choose between Google Hybrid (Satellite with road/location labels), Satellite Only (Clean photo), or Terrain (Topographic contours).

**High-Contrast UI:** Designed with a dark "Stealth" theme to make map details pop, even when using the tool outdoors at the field.

💾 **Intelligent Export System**
**Smart File Naming:** Automatically generates filenames containing the Project Title, the Zoom Scale, and a Timestamp to keep your map library organized.

**Dual-File Export:** Generates the high-quality 24-bit BMP source image and a companion Metadata text file simultaneously.

**Optimized Metadata:** The metadata is pre-calculated with the specific coordinate alignment required by ETHOS hardware, including both DMS (Degrees, Minutes, Seconds) and Decimal formats.

## 🛰️ Metadata Structure
The generated `_metadata.txt` includes:
- **DMS Coordinates:** Degrees, Minutes, Seconds for manual entry. It is MANDATORY to enter them when configuring the GPS map widget.
- **Decimal Geodata:** Precisely formatted North/South/West/East values for the GPS Widget.

📖 **How to Use**

**Locate:** Use the SEARCH box to find your flying site.

**Frame:** Adjust the zoom level until your flying area is centered in the crosshair.

**Lock:** Check the Zoom Lock box and enter your Project Title.

**Download:** Click ⚡ Export All. You will receive two files - .bmp and _metadata.txt

**Finalize:** 

* **Open Ethos Suite and use the Image Manager to transcode the BMP** to the radio's native 16-bit format.

* Copy the resulting file to your radio SD card path: /Bitmaps/GPS/.

* Use the values in the generated _metadata.txt to configure your GPS widget fields.

![Coordinates_Ethos](https://github.com/user-attachments/assets/35171816-a20f-4991-b2a8-8ef600715bb8)

![Map_accuracy](https://github.com/user-attachments/assets/5ec89c74-d227-4e19-910d-f94d4404befb)
