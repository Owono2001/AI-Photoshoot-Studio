# ✨ AI Photoshoot Studio ✨

[![Project Status: Active Development](https://img.shields.io/badge/status-active%20development-yellowgreen?style=for-the-badge)](https://github.com/Owono2001/AI-Photoshoot-Studio) [![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](./LICENSE)
[![Python](https://img.shields.io/badge/Python-3.x-blue?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-Web%20Framework-lightgrey?style=for-the-badge&logo=flask&logoColor=black)](https://flask.palletsprojects.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Fabric.js](https://img.shields.io/badge/Fabric.js-Canvas%20Magic-orange?style=for-the-badge)](http://fabricjs.com/)
[![OpenCV](https://img.shields.io/badge/OpenCV-Image%20Processing-blueviolet?style=for-the-badge&logo=opencv&logoColor=white)](https://opencv.org/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-AI%20Power-ff6f00?style=for-the-badge&logo=tensorflow&logoColor=white)](https://www.tensorflow.org/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Vision%20AI-green?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/mediapipe)

---

## 🎬 Take a Sneak Peek!

Curious about what the AI Photoshoot Studio can do? Watch this quick animated tour showcasing image uploads, webcam captures, AI style transfer, photobooth fun, and more!

<p align="center">
  <img src="static/assets/demo.gif" alt="AI Photoshoot Studio Animated Demo" width="80%">
  <br>
  <em>(Animated GIF Showcase - loading may take a moment)</em>
</p>

---

Welcome to the **AI Photoshoot Studio** – your creative hub for transforming images! This web application blends webcam interaction, canvas editing, a playful photobooth, and a suite of backend image effects, including AI-powered virtual backgrounds and artistic style transfer.

Powered by Python, Flask, OpenCV, TensorFlow, MediaPipe, and Fabric.js, the studio provides a dynamic playground to unleash your visual creativity.

---

## 🚀 Key Features

* 🖼️ **Versatile Inputs:** Upload images (PNG, JPG, WEBP) or snap photos using your webcam.
* 🎨 **Interactive Canvas Editor (Fabric.js):**
    * **Freehand Drawing:** Sketch with adjustable colors and brush sizes.
    * **Text Overlay:** Add and customize text.
    * **Object Control:** Select, move, and delete annotations.
    * **Clear Edits:** Remove drawings/text without losing the base image.
* 📸 **Photobooth Extravaganza:**
    * Turn on your webcam for a multi-shot photo session.
    * Choose from layouts like Vertical Strip, 2x2 Grid, and Horizontal Strips (1x3, 1x4).
    * Select 3, 4, or 6 shots per session.
    * Generate an animated GIF keepsake!
    * Enjoy a visual countdown and preview thumbnails.
    * Apply simple effects (Grayscale, Sepia, Invert) to individual shots during the photobooth sequence.
    * Optionally add decorative frames to your final photobooth creation.
* ✨ **Backend Effects Powerhouse:**
    * **Classic Filters:** Grayscale, Sepia, Invert, Gaussian Blur.
    * **Computer Vision Magic (OpenCV):** Canny Edges, Pencil Sketch Effect, Contour Outlines, ORB Feature Points.
    * **Morphological Ops:** Erode & Dilate effects.
    * **AI Backgrounds (MediaPipe):** Swap your background with blur, a solid color, or a custom image.
    * **AI Artistry (TensorFlow Hub):** Apply the style of famous artworks (or your own!) onto your photos.
* 💡 **Smart & Dynamic UI:**
    * Interface themes adapt visually based on the chosen effect category.
    * Adjust effect parameters in real-time.
    * Organized controls within collapsible sections.
    * Clear loading indicators and helpful error messages.
    * (Optional) Elegant animated particle background (tsParticles).
* 📱 **Responsive Across Devices:** Designed for a smooth experience on desktops, tablets, and smartphones.
* 💾 **One-Click Download:** Easily save your final masterpiece.

---

## 🛠️ Technology Stack

* **Backend:** Python, Flask, Flask-Session
* **Image Processing:** OpenCV, Pillow
* **AI / ML:** TensorFlow, TensorFlow Hub, MediaPipe
* **Frontend:** HTML5, CSS3 (Variables, Gradients, Animations), JavaScript (ES6+)
* **Canvas:** Fabric.js
* **Particles (Opt):** tsParticles
* **Icons:** Font Awesome
* **Config:** python-dotenv
* **VCS:** Git, GitHub

---

## ⚙️ Getting Started

Ready to run the studio locally? Follow these steps.

### Prerequisites

* **Python:** 3.8+ ([Download](https://www.python.org/downloads/))
* **pip:** Python package manager (usually included with Python)
* **Git:** Version control ([Download](https://git-scm.com/downloads))
* **(Recommended) Virtual Environment:** `venv` or `conda`
* **C++ Build Tools:** Potentially needed for some dependencies (check OS specifics: e.g., Build Tools for Visual Studio [Win], `build-essential` [Debian/Ubuntu]).

### Installation

1.  **Clone the Repo:**
    ```bash
    git clone [https://github.com/Owono2001/AI-Photoshoot-Studio.git](https://github.com/Owono2001/AI-Photoshoot-Studio.git) # TODO: Replace with your FINAL repo link
    cd AI-Photoshoot-Studio
    ```

2.  **Setup Virtual Environment (Recommended):**
    ```bash
    # Using venv
    python -m venv venv
    # Activate:
    # Windows: .\venv\Scripts\activate
    # macOS/Linux: source venv/bin/activate
    ```

3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    *(Note: TensorFlow/OpenCV installation can vary. Check their official docs if issues arise.)*

4.  **Configure Environment:**
    Create a `.env` file in the root directory with your secret key:
    ```env
    # .env
    FLASK_SECRET_KEY='REPLACE_WITH_YOUR_OWN_VERY_STRONG_SECRET_KEY_f9a3b1...'

    # Optional overrides for Flask settings:
    # FLASK_RUN_HOST='0.0.0.0' # Accessible on local network
    # FLASK_RUN_PORT=8080
    # FLASK_DEBUG='True' # Development ONLY - Never use in production!

    # Optional Style Transfer Model:
    # STYLE_TRANSFER_MODEL_URL='[https://tfhub.dev/google/magenta/arbitrary-image-stylization-v1-256/2](https://tfhub.dev/google/magenta/arbitrary-image-stylization-v1-256/2)'
    ```
    **Security:** Your `FLASK_SECRET_KEY` must be kept private!

5.  **(If missing) Generate `requirements.txt`:**
    Based on `app.py` imports, a likely list is:
    ```txt
    # requirements.txt
    Flask>=2.0
    Flask-Session>=0.4
    opencv-python>=4.5
    Pillow>=9.0
    numpy>=1.20
    mediapipe>=0.8
    tensorflow>=2.8 # Or tensorflow-cpu
    tensorflow_hub>=0.12
    python-dotenv>=0.19
    ```
    *(Consider adding version specifiers for better reproducibility)*

### Running the App

1.  **Activate your virtual environment.**
2.  **Start the server:**
    ```bash
    python app.py
    ```
3.  **Visit:** Open your browser to the URL provided (typically `http://127.0.0.1:5000/`).

---

## 📖 How to Use

1.  **Get Your Image:** Use "Upload File" or "Start Webcam" followed by "Capture Frame".
2.  **Edit (Optional):** Use the tools (Select, Draw, Text, Delete, Clear) above the "Source Editor".
3.  **Try Photobooth (Optional):** With the webcam active, find "Photobooth Fun!", set options, click "Start Photobooth", and smile!
4.  **Apply Effects (To Single Source Image):** Select an effect and adjust its parameters, then click "Apply Backend Effect".
5.  **Download Your Creation:** Click "Download Result" below the processed image.

*(Tip: The "How to Use This App" section within the application itself provides more detailed, illustrated steps!)*

---

## ⚠️ Important Notes

* **Browser Compatibility:** For the best experience, use a modern browser like Chrome, Firefox, or Edge.
* **Webcam Access:** The app requires permission to access your webcam for the "Webcam" and "Photobooth" features.
* **File Size Limits:** Uploaded images are limited to 100MB.
* **Processing Time:** Some effects, especially AI-powered ones (Virtual Background, Style Transfer), can take a noticeable amount of time to process on the server. Please be patient.
* **Photobooth Frame Disclaimer:** The photobooth frame feature is still under development. While basic frames are supported, more complex frame designs might exhibit stretching or alignment issues, particularly with non-square layouts.
* **Audio Playback:** The application uses your device's speakers to provide audio feedback. Ensure that audio output is enabled and the volume is at an audible level.

---

## 🤝 Contributing

This project is currently under active development by the author. While contributions are not formally open at this moment, suggestions and feedback are welcome! Please feel free to open an issue on GitHub to report bugs or propose new features.

---

## 📄 License

**Proprietary - Under Development**

© 2025 Pedro Fabian Owono. All Rights Reserved.

This project is a work-in-progress by Pedro Fabian Mange Owono Ondo. The code, assets, and functionalities are **not licensed for reuse, modification, distribution, or deployment** without explicit written permission from the author.

Future releases may adopt a different license. Please respect the current proprietary status. For licensing inquiries or collaboration, contact the author.

---

## 🧑‍💻 Author & Contact

* **Pedro Fabian Mange Owono Ondo**
* **GitHub:** [Owono2001](https://github.com/Owono2001)
* **Email:** [owonoondomangue@gmail.com](mailto:owonoondomangue@gmail.com)
* **Portfolio:** [https://owono2001.github.io/MyPortfolio/](https://owono2001.github.io/MyPortfolio/)

---

Thanks for checking out the AI Photoshoot Studio! Stay tuned for more updates.
