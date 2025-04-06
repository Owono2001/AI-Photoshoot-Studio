# ✨ AI Photoshoot Studio ✨

[![Project Status: In Development](https://img.shields.io/badge/status-in%20development-yellow?style=for-the-badge)](https://github.com/Owono2001/AI-Photoshoot-Studio) <!-- Replace with your actual repo link later -->
[![License: Proprietary (Under Development)](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](./LICENSE)
[![Python](https://img.shields.io/badge/Python-3.x-blue?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-Web%20Framework-green?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Fabric.js](https://img.shields.io/badge/Fabric.js-Canvas%20Magic-orange?style=for-the-badge)](http://fabricjs.com/)
[![OpenCV](https://img.shields.io/badge/OpenCV-Image%20Processing-blueviolet?style=for-the-badge&logo=opencv&logoColor=white)](https://opencv.org/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-AI%20Power-orange?style=for-the-badge&logo=tensorflow&logoColor=white)](https://www.tensorflow.org/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Vision%20AI-green?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/mediapipe)

<!-- Optional: Add a captivating screenshot or GIF here! -->
<!-- ![AI Photoshoot Studio Demo](path/to/your/screenshot_or_demo.gif) -->

Welcome to the AI Photoshoot Studio – a cutting-edge web application designed to revolutionize your image creation process. This platform seamlessly integrates live webcam capture, intuitive canvas editing, a fun photobooth experience, and a powerful suite of backend image processing effects, including advanced AI-driven transformations like virtual backgrounds and artistic style transfer.

Built with a modern tech stack featuring Flask, OpenCV, TensorFlow, MediaPipe, and Fabric.js, this studio provides a dynamic and visually engaging environment for users to unleash their creativity.

---

## 🚀 Key Features

*   🖼️ **Multiple Input Methods:** Upload images (PNG, JPG, WEBP) or capture snapshots directly from your webcam.
*   🎨 **Interactive Canvas Editor:** Powered by Fabric.js, edit your source image with tools like:
    *   **Free Drawing:** Sketch directly on the canvas with adjustable color and brush width.
    *   **Text Addition:** Add customizable text elements.
    *   **Object Manipulation:** Select, move, and delete drawings or text.
    *   **Clear Edits:** Easily remove annotations while keeping the base image.
*   📸 **Photobooth Fun:**
    *   Activate your webcam and start a multi-shot sequence.
    *   Choose between different layouts (e.g., Vertical Strip, 2x2 Grid).
    *   Select the number of shots (3, 4, or 6).
    *   Optionally generate an animated GIF from the captures!
    *   Visual countdown timer and preview of taken shots.
*   ✨ **Powerful Backend Effects:** Apply a diverse range of effects processed server-side:
    *   **Filters:** Grayscale, Sepia, Invert, Gaussian Blur.
    *   **Computer Vision (CV):** Canny Edge Detection, Pencil Sketch, Contour Finding, ORB Feature Detection.
    *   **Morphological Operations:** Erode, Dilate.
    *   **AI - Virtual Background (MediaPipe):** Replace your background with blur, a solid color, or a custom uploaded image.
    *   **AI - Style Transfer (TensorFlow Hub):** Transfer the artistic style from famous artworks (or your own uploaded style image) onto your photo.
*   💡 **Dynamic UI & Theming:**
    *   The interface adapts based on the selected effect category, changing color schemes and accents.
    *   Real-time parameter adjustments for effects.
    *   Collapsible sections for cleaner navigation.
    *   Loading indicators and clear error messaging.
    *   (Optional) Subtle animated particle background using tsParticles.
*   📱 **Responsive Design:** Crafted to provide a seamless experience across various screen sizes, from desktops to mobile devices.
*   💾 **Easy Download:** Download your final creation with a single click.

---

## 🛠️ Tech Stack

*   **Backend:** Python, Flask, Flask-Session
*   **Image Processing:** OpenCV, Pillow
*   **AI / Machine Learning:** TensorFlow, TensorFlow Hub, MediaPipe
*   **Frontend:** HTML5, CSS3 (with Variables, Gradients, Animations), JavaScript (ES6+)
*   **Canvas Interaction:** Fabric.js
*   **Particles (Optional):** tsParticles
*   **Icons:** Font Awesome
*   **Environment Management:** python-dotenv
*   **Version Control:** Git, GitHub

---

## ⚙️ Getting Started

Follow these steps to set up and run the AI Photoshoot Studio locally.

### Prerequisites

*   **Python:** Version 3.8 or higher. ([Download Python](https://www.python.org/downloads/))
*   **pip:** Python package installer (usually comes with Python).
*   **Git:** Version control system. ([Download Git](https://git-scm.com/downloads))
*   **(Optional but Recommended) Virtual Environment:** Tools like `venv` or `conda` to isolate project dependencies.
*   **C++ Build Tools:** May be required by some dependencies (like `dlib` if used indirectly, or for building `tensorflow` / `opencv` from source if needed, though pre-built wheels usually work). Check your OS documentation (e.g., Build Tools for Visual Studio on Windows, `build-essential` on Debian/Ubuntu).

### Installation

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/Owono2001/AI-Photoshoot-Studio.git # Replace with your actual repo link later
    cd AI-Photoshoot-Studio
    ```

2.  **Create and Activate a Virtual Environment (Recommended):**
    ```bash
    # Using venv (built-in)
    python -m venv venv
    # Windows
    .\venv\Scripts\activate
    # macOS/Linux
    source venv/bin/activate
    ```

3.  **Install Dependencies:**
    Make sure you have a `requirements.txt` file (see below if you don't). Then run:
    ```bash
    pip install -r requirements.txt
    ```
    *Note: Installing TensorFlow and OpenCV can sometimes be tricky depending on your OS and hardware (CPU/GPU). Refer to their official installation guides if you encounter issues.*

4.  **Set Up Environment Variables:**
    Create a file named `.env` in the project root directory. Add the following line, replacing the value with your own strong, random secret key:
    ```env
    # .env
    FLASK_SECRET_KEY='YOUR_VERY_STRONG_AND_SECRET_KEY_HERE_f9a3b1...'
    # Optional: Specify a different Style Transfer Model URL
    # STYLE_TRANSFER_MODEL_URL='https://tfhub.dev/google/magenta/arbitrary-image-stylization-v1-256/2'
    # Optional: Configure Flask run settings (defaults are 127.0.0.1:5000, debug=False)
    # FLASK_RUN_HOST='0.0.0.0' # To make accessible on local network
    # FLASK_RUN_PORT=8080
    # FLASK_DEBUG='True' # Enable debug mode for development ONLY
    ```
    **Important:** The `FLASK_SECRET_KEY` is crucial for session security. Keep it secret!

5.  **(If needed) Create `requirements.txt`:**
    If you don't have this file, you can generate it based on the imports in `app.py`. A likely list is:
    ```txt
    # requirements.txt
    Flask
    Flask-Session
    opencv-python
    Pillow
    numpy
    mediapipe
    tensorflow
    tensorflow_hub
    python-dotenv
    # Add any other direct dependencies identified
    ```

### Running the Application

1.  **Ensure your virtual environment is activated.**
2.  **Run the Flask development server:**
    ```bash
    python app.py
    ```
3.  **Open your web browser** and navigate to the address shown in the terminal (usually `http://127.0.0.1:5000/`).

---

## 📖 Usage

1.  **Load an Image:** Either click "Upload File" to select an image from your device or click "Start Webcam", grant permission, and then "Capture Frame".
2.  **(Optional) Edit:** Use the tools above the "Source Editor" canvas (Select, Draw, Text, Delete, Clear Edits) to modify your source image.
3.  **(Optional) Photobooth:** If the webcam is active, configure layout/shots/GIF options under "Photobooth Fun!", click "Start Photobooth", and follow the countdowns.
4.  **Choose an Effect:** Select the desired effect from the "Choose Effect" dropdown.
5.  **Adjust Parameters:** If parameters appear under "Adjust Parameters", tweak them to your liking. (Note: For AI effects like VBG or Style Transfer, you might need to upload an additional background or style image).
6.  **Apply Effect:** Click the "Apply Backend Effect" button. Wait for the processing (AI effects can take longer).
7.  **View & Download:** The processed image will appear in the "Processed Result" box. Click "Download Result" to save it.

*(Refer to the "How to Use This App" section within the application itself for detailed, step-by-step guidance with icons!)*

---

## 📄 License

**Proprietary - Under Development**

© 2025 Pedro Fabian Owono. All Rights Reserved.

This project is currently under active development and refinement by Pedro Fabian Mange Owono Ondo. As such, the code, assets, and functionalities presented here are **not licensed for reuse, modification, distribution, or deployment** by any other party without explicit written permission from the author.

The intention is to further develop and potentially release this project under a different license in the future. Until then, please respect the proprietary nature of this work-in-progress.

For inquiries regarding licensing or collaboration, please contact the author.

---

## 🧑‍💻 Author & Contact

*   **Pedro Fabian Mange Owono Ondo**
*   **GitHub:** [Owono2001](https://github.com/Owono2001)
*   **Email:** [owonoondomangue@gmail.com](mailto:owonoondomangue@gmail.com)
*   **Portfolio:** [https://owono2001.github.io/MyPortfolio/](https://owono2001.github.io/MyPortfolio/)

---

Feel free to explore the code, and stay tuned for updates!
