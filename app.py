# app.py (FULL CODE - Updated April 6, 2025)

import os
import uuid
import cv2 # OpenCV
import numpy as np
from PIL import Image, ImageFilter, ImageOps, ImageDraw, ImageFont # Pillow for image manipulation & GIF
from io import BytesIO
import base64
import time # For basic timing/debugging
import traceback # For detailed error logging
import math # For photobooth grid calculations

# --- Imports for Advanced Features ---
import mediapipe as mp
import tensorflow as tf
import tensorflow_hub as tf_hub

from flask import Flask, render_template, request, jsonify, session, url_for, send_from_directory
from flask_session import Session # Handles server-side sessions
from dotenv import load_dotenv # For loading environment variables

load_dotenv() # Load environment variables from .env file

# --- Configuration ---
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
GENERATED_FOLDER = os.path.join(BASE_DIR, 'generated')
STATIC_FOLDER = os.path.join(BASE_DIR, 'static') # Flask default, but explicit can be good
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
# --- Persistent Storage Configuration for Render ---
# Check if running on Render and the disk mount path is set
RENDER_DISK_MOUNT_PATH = os.getenv('RENDER_DISK_MOUNT_PATH')
if RENDER_DISK_MOUNT_PATH and os.path.isdir(RENDER_DISK_MOUNT_PATH):
    print(f"INFO: Detected Render disk at: {RENDER_DISK_MOUNT_PATH}")
    # Define persistent directories ON THE RENDER DISK
    PERSISTENT_STORAGE_BASE = RENDER_DISK_MOUNT_PATH
    SESSION_DIR = os.path.join(PERSISTENT_STORAGE_BASE, '.flask_session')
    UPLOAD_DIR = os.path.join(PERSISTENT_STORAGE_BASE, 'uploads')
    GENERATED_DIR = os.path.join(PERSISTENT_STORAGE_BASE, 'generated')
    # Optional: Style directory might still be in static if they don't change
    STATIC_FOLDER = os.path.join(BASE_DIR, 'static')
else:
    # Fallback for local development (or if disk not mounted correctly)
    print("INFO: Render disk not detected or path invalid. Using local directories.")
    SESSION_DIR = os.path.join(BASE_DIR, '.flask_session')
    UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
    GENERATED_DIR = os.path.join(BASE_DIR, 'generated')
    STATIC_FOLDER = os.path.join(BASE_DIR, 'static')

# Ensure directories exist (both locally and on Render disk)
os.makedirs(SESSION_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(GENERATED_DIR, exist_ok=True)
# Ensure static/styles exists if needed for default styles
os.makedirs(os.path.join(STATIC_FOLDER, 'styles'), exist_ok=True)

app = Flask(__name__, static_folder=STATIC_FOLDER) # Use static folder path
app.config['UPLOAD_FOLDER'] = UPLOAD_DIR # Use persistent/local path
app.config['GENERATED_FOLDER'] = GENERATED_DIR # Use persistent/local path
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

# Configure Flask-Session
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_FILE_DIR"] = SESSION_DIR # Use persistent/local path
app.config["SECRET_KEY"] = os.getenv('FLASK_SECRET_KEY', 'local_fallback_secret_key_change_me') # Read from Env Var
Session(app)

# --- Global Stats (Simple In-Memory - Reset on App Restart) ---
user_visits = 0
photoshoots_created = 0 # Counts single effect applications
photobooths_created = 0 # NEW: Counts photobooth compositions

# --- Load AI Models (Load ONCE on startup) ---
print("--- Initializing AI Models ---")
models_loaded = {'mediapipe': False, 'tensorflow': False}
selfie_segmentation = None
hub_module = None

try:
    # MediaPipe Selfie Segmentation
    print("Loading MediaPipe Selfie Segmentation...")
    mp_selfie_segmentation = mp.solutions.selfie_segmentation
    selfie_segmentation = mp_selfie_segmentation.SelfieSegmentation(model_selection=0)
    models_loaded['mediapipe'] = True
    print("MediaPipe Selfie Segmentation loaded successfully.")
except ImportError:
    print("WARNING: MediaPipe library not found. Install with 'pip install mediapipe'. VBG effect disabled.")
except Exception as e:
    print(f"WARNING: Failed to load MediaPipe model: {e}")
    print("Virtual Background effect will be unavailable.")

try:
    # TensorFlow Hub Style Transfer Model
    print("Loading TensorFlow Hub Style Transfer model...")
    style_model_url = os.getenv('STYLE_TRANSFER_MODEL_URL', 'https://tfhub.dev/google/magenta/arbitrary-image-stylization-v1-256/2')
    hub_module = tf_hub.load(style_model_url)
    models_loaded['tensorflow'] = True
    print(f"TensorFlow Hub Style Transfer model loaded successfully from: {style_model_url}")
except ImportError:
     print("WARNING: TensorFlow or TensorFlow Hub library not found. Install with 'pip install tensorflow tensorflow_hub'. Style Transfer effect disabled.")
except tf.errors.NotFoundError as e:
    print(f"ERROR: Could not find TensorFlow model at URL: {style_model_url}. Check URL and internet connection.")
    print(f"Details: {e}")
    print("Style Transfer effect will be unavailable.")
except Exception as e:
    print(f"WARNING: Failed to load TensorFlow Hub model: {e}")
    traceback.print_exc()
    print("Style Transfer effect will be unavailable.")

print("--- AI Models initialization complete. ---")

# --- Helper Functions ---

def allowed_file(filename):
    """Checks if the filename has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def decode_image_from_data_url(data_url):
    """Decodes a base64 Data URL string into PIL Image."""
    try:
        header, encoded = data_url.split(",", 1)
        image_data = base64.b64decode(encoded)
        img_pil = Image.open(BytesIO(image_data)).convert("RGB")
        return img_pil
    except Exception as e:
        print(f"Error decoding base64 Data URL: {e}")
        # Consider adding more specific error context if needed
        raise ValueError(f"Invalid image Data URL format provided.")

def decode_image_from_bytes(image_data):
    """Decodes image data (bytes) into a PIL Image object."""
    try:
        img_pil = Image.open(BytesIO(image_data)).convert("RGB")
        return img_pil
    except Exception as e:
        print(f"Error decoding image bytes: {e}")
        raise ValueError(f"Could not decode image bytes: {e}")

def encode_image_to_data_url(img_pil, format='PNG'):
    """Encodes a PIL Image object into a base64 Data URL string."""
    try:
        output_buffer = BytesIO()
        save_format = 'JPEG' if format.upper() in ['JPG', 'JPEG'] else 'PNG'
        # Handle potential transparency issues for JPEG
        if save_format == 'JPEG' and img_pil.mode == 'RGBA':
             print("Warning: Saving RGBA image as JPEG, converting to RGB.")
             img_pil = img_pil.convert('RGB')
        img_pil.save(output_buffer, format=save_format)
        output_buffer.seek(0)
        encoded_string = base64.b64encode(output_buffer.read()).decode('utf-8')
        mime_type = f"image/{save_format.lower()}"
        return f"data:{mime_type};base64,{encoded_string}"
    except Exception as e:
        print(f"Error encoding image to Data URL: {e}")
        raise ValueError(f"Could not encode image to Data URL: {e}")

# --- Image Processing Functions ---

def apply_simple_effects(img_pil, effect, params):
    """Applies basic Pillow/OpenCV effects. Expects params dict with typed values."""
    print(f"Applying simple effect '{effect}' with params: {params}")
    try:
        if effect == 'grayscale':
            return ImageOps.grayscale(img_pil).convert("RGB")
        elif effect == 'sepia':
            if img_pil.mode != 'RGB': img_pil = img_pil.convert('RGB')
            sepia_matrix = (0.393, 0.769, 0.189, 0, 0.349, 0.686, 0.168, 0, 0.272, 0.534, 0.131, 0)
            return img_pil.convert("RGB", sepia_matrix)
        elif effect == 'invert':
            return ImageOps.invert(img_pil.convert("RGB"))
        elif effect == 'blur':
            radius = params.get('blur_radius', 5)
            return img_pil.filter(ImageFilter.GaussianBlur(radius=radius))

        # OpenCV based effects
        elif effect in ['canny_edge', 'sketch', 'contours', 'orb_features', 'erode', 'dilate']:
            np_img_rgb = np.array(img_pil)

            if effect == 'canny_edge':
                gray = cv2.cvtColor(np_img_rgb, cv2.COLOR_RGB2GRAY)
                low_thresh = params.get('canny_low', 50)
                high_thresh = params.get('canny_high', 150)
                edges = cv2.Canny(gray, threshold1=low_thresh, threshold2=high_thresh)
                return Image.fromarray(cv2.cvtColor(edges, cv2.COLOR_GRAY2RGB))
            elif effect == 'sketch':
                grey_img = cv2.cvtColor(np_img_rgb, cv2.COLOR_RGB2GRAY)
                invert = cv2.bitwise_not(grey_img)
                blur_ksize = params.get('sketch_blur', 21)
                if blur_ksize % 2 == 0: blur_ksize += 1
                blur = cv2.GaussianBlur(invert, (blur_ksize, blur_ksize), 0)
                inverted_blur = cv2.bitwise_not(blur)
                sketch = cv2.divide(grey_img, inverted_blur, scale=256.0)
                return Image.fromarray(cv2.cvtColor(sketch, cv2.COLOR_GRAY2RGB))
            elif effect == 'contours':
                gray = cv2.cvtColor(np_img_rgb, cv2.COLOR_RGB2GRAY)
                threshold = params.get('contour_thresh', 127)
                thickness = params.get('contour_thick', 2)
                ret, thresh = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
                contours_found, hierarchy = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
                output_img = np_img_rgb.copy()
                cv2.drawContours(output_img, contours_found, -1, (0, 255, 0), thickness) # Green contours
                return Image.fromarray(output_img)
            elif effect == 'orb_features':
                n_features = params.get('orb_features', 500)
                orb = cv2.ORB_create(nfeatures=n_features)
                gray = cv2.cvtColor(np_img_rgb, cv2.COLOR_RGB2GRAY)
                keypoints = orb.detect(gray, None)
                img_with_keypoints = cv2.drawKeypoints(np_img_rgb.copy(), keypoints, None, color=(0, 255, 0), flags=0)
                return Image.fromarray(img_with_keypoints)
            elif effect == 'erode':
                kernel_size = params.get('morph_kernel', 5)
                iterations = params.get('morph_iter', 1)
                kernel = np.ones((kernel_size, kernel_size), np.uint8)
                eroded = cv2.erode(np_img_rgb, kernel, iterations=iterations)
                return Image.fromarray(eroded)
            elif effect == 'dilate':
                kernel_size = params.get('morph_kernel', 5)
                iterations = params.get('morph_iter', 1)
                kernel = np.ones((kernel_size, kernel_size), np.uint8)
                dilated = cv2.dilate(np_img_rgb, kernel, iterations=iterations)
                return Image.fromarray(dilated)
        else:
            print(f"Warning: Unknown simple effect '{effect}'. Returning original.")
            return img_pil
    except Exception as e:
        print(f"Error applying simple effect '{effect}': {e}")
        traceback.print_exc()
        raise RuntimeError(f"Failed during '{effect}' processing: {e}")


def apply_mediapipe_vbg(img_pil, params):
    """Applies virtual background using MediaPipe."""
    if not models_loaded['mediapipe'] or selfie_segmentation is None:
        raise RuntimeError("MediaPipe model not loaded. Cannot apply Virtual Background.")

    print(f"Applying MediaPipe VBG with params: {params}")
    bg_choice = params.get('vbg_choice', 'blur')
    blur_amount = params.get('vbg_blur_amount', 15)
    bg_color_hex = params.get('vbg_color', '#00FF00')
    bg_image_data = params.get('bg_image_data', None) # Expecting bytes

    try:
        frame_rgb = np.array(img_pil)
        results = selfie_segmentation.process(frame_rgb)
        condition = np.stack((results.segmentation_mask,) * 3, axis=-1) > 0.1

        h, w = frame_rgb.shape[:2]
        background = None

        if bg_choice == 'blur':
            blurred_frame = cv2.GaussianBlur(frame_rgb, (0, 0), sigmaX=blur_amount, sigmaY=blur_amount)
            background = blurred_frame
        elif bg_choice == 'color':
            bg_color_hex = bg_color_hex.lstrip('#')
            try:
                bg_color_rgb = tuple(int(bg_color_hex[i:i+2], 16) for i in (0, 2, 4))
            except ValueError:
                print(f"Warning: Invalid background color hex '{bg_color_hex}'. Using default green.")
                bg_color_rgb = (0, 255, 0)
            background = np.zeros(frame_rgb.shape, dtype=np.uint8)
            background[:] = bg_color_rgb
        elif bg_choice == 'image' and bg_image_data:
            try:
                bg_pil = decode_image_from_bytes(bg_image_data)
                bg_pil_resized = bg_pil.resize((w, h), Image.Resampling.LANCZOS)
                background = np.array(bg_pil_resized)
            except Exception as img_err:
                print(f"Error processing uploaded background image: {img_err}. Falling back to blur.")
                bg_choice = 'blur' # Fallback
        else:
            if bg_choice != 'blur':
                 print(f"Warning: VBG choice '{bg_choice}' invalid or background image missing. Defaulting to blur.")
            bg_choice = 'blur'

        if background is None and bg_choice == 'blur': # Fallback definition
            blurred_frame = cv2.GaussianBlur(frame_rgb, (0, 0), sigmaX=blur_amount, sigmaY=blur_amount)
            background = blurred_frame

        if background is None:
            raise RuntimeError("Failed to create any valid background for VBG.")

        output_image = np.where(condition, frame_rgb, background)
        return Image.fromarray(output_image)

    except Exception as e:
        print(f"Error during MediaPipe VBG: {e}")
        traceback.print_exc()
        raise RuntimeError(f"MediaPipe VBG failed: {e}")


def apply_style_transfer(img_pil, params, custom_style_image_data=None):
    """Applies style transfer using TensorFlow Hub, optionally using a custom uploaded style."""
    if not models_loaded['tensorflow'] or hub_module is None:
        raise RuntimeError("TensorFlow Hub model not loaded. Cannot apply Style Transfer.")

    style_image_source_description = "default style image"

    try:
        style_pil = None
        # Prioritize custom uploaded style
        if custom_style_image_data:
            print("Using custom uploaded style image.")
            style_image_source_description = "uploaded custom style"
            try:
                style_pil = decode_image_from_bytes(custom_style_image_data)
            except Exception as img_err:
                print(f"Error decoding uploaded custom style image: {img_err}. Falling back to selected style.")
                # Fall through if decoding fails

        # Use selected style if no custom data OR decoding failed
        if style_pil is None:
            style_choice = params.get('style_choice')
            if not style_choice:
                 raise ValueError("No style selected and no valid custom style uploaded.")
            style_img_path = os.path.join(app.static_folder, 'styles', style_choice)
            print(f"Using selected style image: {style_choice}")
            style_image_source_description = f"selected style ({style_choice})"

            if not os.path.exists(style_img_path):
                raise FileNotFoundError(f"Selected style image not found at expected path: {style_img_path}")
            style_pil = Image.open(style_img_path).convert("RGB")

        # Preprocess Content Image
        content_image = np.array(img_pil) / 255.0
        if content_image.shape[-1] == 4: content_image = content_image[..., :3]
        content_image_tensor = tf.convert_to_tensor(content_image, dtype=tf.float32)[tf.newaxis, :]

        # Preprocess Style Image
        style_image = np.array(style_pil) / 255.0
        if style_image.shape[-1] == 4: style_image = style_image[..., :3]
        style_image_tensor = tf.convert_to_tensor(style_image, dtype=tf.float32)[tf.newaxis, :]

        # Input Size Check (for specific TF Hub model)
        max_dim = 512
        content_shape = tf.shape(content_image_tensor)[1:3]
        if tf.reduce_max(content_shape) > max_dim:
             print(f"Warning: Content image dimension ({tf.reduce_max(content_shape)}) > {max_dim}. Resizing.")
             scale = max_dim / tf.cast(tf.reduce_max(content_shape), tf.float32)
             new_shape = tf.cast(tf.cast(content_shape, tf.float32) * scale, tf.int32)
             content_image_tensor = tf.image.resize(content_image_tensor[0], new_shape)[tf.newaxis, :]
             print(f"Resized content image to: {new_shape.numpy()}")

        # Run Inference
        print(f"Running style transfer inference using {style_image_source_description}...")
        start_tf_time = time.time()
        outputs = hub_module(tf.constant(content_image_tensor), tf.constant(style_image_tensor))
        stylized_image_tensor = outputs[0]
        end_tf_time = time.time()
        print(f"Style transfer TensorFlow inference took {end_tf_time - start_tf_time:.2f} seconds.")

        # Postprocess
        stylized_image = np.squeeze(stylized_image_tensor.numpy())
        stylized_image = np.clip(stylized_image * 255, 0, 255).astype(np.uint8)
        return Image.fromarray(stylized_image)

    except FileNotFoundError as fnf_err:
        print(f"Style image error: {fnf_err}")
        raise fnf_err
    except tf.errors.InvalidArgumentError as tf_arg_err:
        print(f"TensorFlow InvalidArgumentError: {tf_arg_err}")
        traceback.print_exc()
        raise RuntimeError("Image size/format incompatible with Style Transfer model.")
    except Exception as e:
        print(f"Error during Style Transfer: {e}")
        traceback.print_exc()
        raise RuntimeError(f"Style Transfer processing failed: {e}")


# --- Parameter Parsing Helper ---
def parse_params(form_data, effect_config):
    """Parses form data based on effect config, handling types and defaults."""
    params = {}
    config_params = effect_config.get('params', {})

    for param_name, config in config_params.items():
        value = form_data.get(param_name)
        param_type = config.get('type')
        default_value = config.get('value')

        if param_type == 'file': continue # Files handled separately in routes
        elif param_type == 'checkbox':
            params[param_name] = value in ['true', 'on'] # JS sends 'true'/'false', form 'on'
        elif value is None:
            params[param_name] = default_value
        else:
            try:
                if param_type in ['range', 'number']:
                    step = config.get('step', 1)
                    params[param_name] = float(value) if isinstance(step, float) or '.' in str(step) else int(value)
                elif param_type in ['text', 'select', 'color']:
                    params[param_name] = str(value)
                else:
                    params[param_name] = value
            except (ValueError, TypeError) as e:
                print(f"Warning: Could not parse param '{param_name}' (value: '{value}', type: {param_type}). Using default '{default_value}'. Error: {e}")
                params[param_name] = default_value
    return params

# --- Main Process Route ---
@app.route('/process', methods=['POST'])
def handle_process():
    """Handles single image processing based on form data."""
    global photoshoots_created
    start_req_time = time.time()
    error_uuid = uuid.uuid4()

    try:
        # Get Image Data
        img_pil = None
        if 'image_data_url' in request.form and request.form['image_data_url']:
            img_pil = decode_image_from_data_url(request.form['image_data_url'])
        else:
            raise ValueError("No valid image data found.")
        if img_pil is None: raise ValueError("Failed to decode image data.")

        # Get Effect and Config
        effect = request.form.get('effect', 'none')
        effects_dict = get_available_effects()
        effect_config = effects_dict.get(effect)
        if not effect_config: raise ValueError(f"Unknown effect selected: {effect}")
        print(f"Request ID {error_uuid}: Effect='{effect}'")

        # Parse Parameters
        params = parse_params(request.form, effect_config)

        # Handle File Parameters (VBG background, Custom Style)
        params['bg_image_data'] = None
        custom_style_data = None

        if effect == 'mediapipe_vbg' and 'vbg_bg_image' in request.files and request.files['vbg_bg_image'].filename != '':
            bg_file = request.files['vbg_bg_image']
            if allowed_file(bg_file.filename): params['bg_image_data'] = bg_file.read()
            else: print(f"Warning: VBG background image type not allowed ({bg_file.filename}), ignoring.")

        if effect == 'style_transfer' and 'custom_style_image' in request.files and request.files['custom_style_image'].filename != '':
             style_file = request.files['custom_style_image']
             if allowed_file(style_file.filename): custom_style_data = style_file.read()
             else: print(f"Warning: Custom style image type not allowed ({style_file.filename}), ignoring.")

        log_params = {k: (v if not isinstance(v, bytes) else f"<bytes len:{len(v)}>") for k, v in params.items()}
        print(f"Request ID {error_uuid}: Parsed Params={log_params}")

        # Apply Effect
        start_effect_time = time.time()
        processed_pil = None
        if effect == 'none':
            processed_pil = img_pil
        elif effect_config['category'] in ['filter', 'cv', 'morphology']: # Use category
             processed_pil = apply_simple_effects(img_pil, effect, params)
        elif effect == 'mediapipe_vbg':
             processed_pil = apply_mediapipe_vbg(img_pil, params)
        elif effect == 'style_transfer':
             processed_pil = apply_style_transfer(img_pil, params, custom_style_image_data=custom_style_data)
        else:
            print(f"Warning: Apply block reached with unknown effect category/type '{effect}'. Returning original.")
            processed_pil = img_pil

        effect_time = time.time() - start_effect_time
        print(f"Request ID {error_uuid}: Effect '{effect}' processing took {effect_time:.2f} seconds.")
        if processed_pil is None: raise RuntimeError("Processing function returned None unexpectedly.")

        # Encode Result
        processed_data_url = encode_image_to_data_url(processed_pil, format='PNG')

        # Increment Stats & Respond
        photoshoots_created += 1
        total_req_time = time.time() - start_req_time
        print(f"Request ID {error_uuid}: Total request time: {total_req_time:.2f} seconds. Success.")
        return jsonify({
            'success': True,
            'processed_data_url': processed_data_url,
            'effect_applied': effect,
            'processing_time_seconds': round(effect_time, 2)
        })

    except Exception as e:
        total_req_time = time.time() - start_req_time
        print(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print(f"ERROR Processing Request (ID: {error_uuid}, Total Time: {total_req_time:.2f}s)")
        print(f"Effect attempted: {request.form.get('effect', 'N/A')}")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Details: {e}")
        traceback.print_exc()
        print(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        return jsonify({
            'success': False,
            'error': 'Processing failed on server.',
            'details': f'An error occurred during processing ({type(e).__name__}). Please check inputs or try again. (Error ID: {error_uuid})',
        }), 500


# --- Function to Define Available Effects ---
def get_available_effects():
    """Returns the dictionary defining effects, their parameters, and categories."""
    CAT_NONE = 'none'
    CAT_FILTER = 'filter'
    CAT_CV = 'cv'
    CAT_MORPH = 'morphology'
    CAT_AI = 'ai'

    available_effects = {
        'none': {'name': 'Original', 'params': {}, 'category': CAT_NONE},
        'grayscale': {'name': 'Grayscale', 'params': {}, 'category': CAT_FILTER},
        'sepia': {'name': 'Sepia Tone', 'params': {}, 'category': CAT_FILTER},
        'invert': {'name': 'Invert Colors', 'params': {}, 'category': CAT_FILTER},
        'blur': {'name': 'Blur (Gaussian)', 'params': {
            'blur_radius': {'type': 'range', 'min': 1, 'max': 50, 'value': 5, 'label': 'Radius', 'hint': 'Controls blur intensity.'}
        }, 'category': CAT_FILTER},
        'canny_edge': {'name': 'Edge Detection (Canny)', 'params': {
            'canny_low': {'type': 'range', 'min': 1, 'max': 200, 'value': 50, 'label': 'Low Threshold'},
            'canny_high': {'type': 'range', 'min': 1, 'max': 250, 'value': 150, 'label': 'High Threshold'}
        }, 'hint': 'Finds sharp edges.', 'category': CAT_CV},
        'sketch': {'name': 'Pencil Sketch', 'params': {
            'sketch_blur': {'type': 'range', 'min': 1, 'max': 25, 'value': 10, 'label': 'Blur Intensity'} # Kernel size is 2*value+1
        }, 'hint': 'Creates a pencil sketch.', 'category': CAT_CV},
        'contours': {'name': 'Find & Draw Contours', 'params': {
             'contour_thresh': {'type': 'range', 'min': 1, 'max': 254, 'value': 127, 'label': 'Binary Threshold'},
             'contour_thick': {'type': 'range', 'min': -1, 'max': 10, 'value': 2, 'label': 'Thickness (-1=fill)'}
        }, 'hint': 'Outlines shapes found.', 'category': CAT_CV},
        'orb_features': {'name': 'Detect ORB Features', 'params': {
             'orb_features': {'type': 'range', 'min': 50, 'max': 2000, 'step': 50, 'value': 500, 'label': 'Max Features'}
        }, 'hint': 'Detects key interest points.', 'category': CAT_CV},
        'erode': {'name': 'Erode (Shrink Bright)', 'params': {
             'morph_kernel': {'type': 'range', 'min': 2, 'max': 15, 'value': 5, 'label': 'Kernel Size'},
             'morph_iter': {'type': 'range', 'min': 1, 'max': 5, 'value': 1, 'label': 'Iterations'}
        }, 'hint': 'Shrinks bright regions.', 'category': CAT_MORPH},
        'dilate': {'name': 'Dilate (Expand Bright)', 'params': {
             'morph_kernel': {'type': 'range', 'min': 2, 'max': 15, 'value': 5, 'label': 'Kernel Size'},
             'morph_iter': {'type': 'range', 'min': 1, 'max': 5, 'value': 1, 'label': 'Iterations'}
        }, 'hint': 'Expands bright regions.', 'category': CAT_MORPH},
    }
    # Add AI effects conditionally
    if models_loaded['mediapipe']:
        available_effects['mediapipe_vbg'] = {'name': '✨ Virtual Background (MP)', 'params': {
            'vbg_choice': {'type': 'select', 'options': {'blur': 'Blur Background', 'color': 'Color Background', 'image': 'Image Background'}, 'value': 'blur', 'label': 'BG Type'},
            'vbg_blur_amount': {'type': 'range', 'min': 1, 'max': 50, 'value': 15, 'label': 'Blur Amount', 'hint': 'Used for Blur.'},
            'vbg_color': {'type': 'color', 'value': '#00ff00', 'label': 'BG Color', 'hint': 'Used for Color.'},
            'vbg_bg_image': {'type': 'file', 'accept': 'image/*', 'label': 'Upload BG Image', 'hint': 'Used for Image.'}
        }, 'hint': 'Replaces background via AI.', 'category': CAT_AI}
    else: print("INFO: MediaPipe VBG effect disabled (model load failed).")

    if models_loaded['tensorflow']:
        styles_dir = os.path.join(app.static_folder, 'styles')
        available_styles = {}
        default_style_key = None
        if os.path.exists(styles_dir):
            try:
                style_files = sorted([f for f in os.listdir(styles_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
                available_styles = {f: os.path.splitext(f)[0].replace('_', ' ').title() for f in style_files}
                if style_files: default_style_key = style_files[0]
            except Exception as e: print(f"Warning: Could not scan styles directory '{styles_dir}': {e}")

        if available_styles:
            style_transfer_params = {
                'style_choice': {'type': 'select', 'options': available_styles, 'value': default_style_key, 'label': 'Preset Style'}
            }
            style_transfer_params['custom_style_image'] = {
                'type': 'file', 'accept': 'image/*', 'label': 'Custom Style (Optional)', 'hint': 'Overrides preset if selected.'
            }
            available_effects['style_transfer'] = {
                'name': '🎨 Style Transfer (TF Hub)', 'params': style_transfer_params,
                'hint': 'Applies artistic style.', 'category': CAT_AI
            }
        else: print("Warning: No style images found in static/styles/. Style Transfer disabled.")
    else: print("INFO: TensorFlow Style Transfer effect disabled (model load failed).")

    return available_effects


# === PHOTOBOOTH BACKEND LOGIC ===

def compose_photobooth_images(images_pil, layout, num_shots, create_gif=False, bg_color=(255, 255, 255), padding=10):
    """Composes PIL images into a strip or grid, optionally creating a GIF."""
    if not images_pil: raise ValueError("No images provided for composition.")

    first_image = images_pil[0]
    img_width, img_height = first_image.size
    output_format = 'gif' if create_gif else 'png'

    if create_gif:
        output_buffer = BytesIO()
        frame_duration = 500 # ms per frame
        images_pil[0].save(
            output_buffer, format='GIF', save_all=True,
            append_images=images_pil[1:], duration=frame_duration, loop=0, optimize=False
        )
        output_buffer.seek(0)
        return output_buffer.getvalue(), 'gif' # Return raw GIF bytes

    else:
        if layout == 'vertical_strip':
            total_width = img_width + 2 * padding
            total_height = (img_height * num_shots) + ((num_shots + 1) * padding)
            composed_image = Image.new('RGB', (total_width, total_height), bg_color)
            current_y = padding
            for img in images_pil:
                composed_image.paste(img, (padding, current_y))
                current_y += img_height + padding
            return composed_image, output_format

        elif layout == 'grid_2x2':
            cols = 2
            rows = math.ceil(num_shots / cols)
            if num_shots <= 2: rows, cols = 1, num_shots # Adjust for 1 or 2 shots

            total_width = (img_width * cols) + ((cols + 1) * padding)
            total_height = (img_height * rows) + ((rows + 1) * padding)
            composed_image = Image.new('RGB', (total_width, total_height), bg_color)

            current_x, current_y, img_index = padding, padding, 0
            for r in range(rows):
                for c in range(cols):
                    if img_index < len(images_pil):
                        composed_image.paste(images_pil[img_index], (current_x, current_y))
                        img_index += 1
                    current_x += img_width + padding
                current_x = padding
                current_y += img_height + padding
            return composed_image, output_format

        else: # Fallback to vertical strip
             print(f"Warning: Unknown layout '{layout}'. Defaulting to vertical strip.")
             total_width = img_width + 2 * padding
             total_height = (img_height * num_shots) + ((num_shots + 1) * padding)
             composed_image = Image.new('RGB', (total_width, total_height), bg_color)
             current_y = padding
             for img in images_pil:
                 composed_image.paste(img, (padding, current_y))
                 current_y += img_height + padding
             return composed_image, output_format


@app.route('/photobooth_process', methods=['POST'])
def handle_photobooth_process():
    """Handles composing photobooth images based on frontend data."""
    global photobooths_created # Use the new counter
    start_req_time = time.time()
    error_uuid = uuid.uuid4()

    try:
        # Get Parameters
        layout = request.form.get('layout', 'vertical_strip')
        num_shots_str = request.form.get('shots', '4')
        create_gif_str = request.form.get('create_gif', 'false')
        create_gif = create_gif_str.lower() == 'true'
        num_shots = int(num_shots_str)

        # Get Image Data (handle keys like 'captures[0]')
        capture_keys = sorted([k for k in request.form if k.startswith('captures[')])
        actual_received = len(capture_keys)
        if actual_received != num_shots:
            print(f"Warning: Expected {num_shots} shots, received {actual_received}. Using received count.")
            num_shots = actual_received
        if num_shots == 0: raise ValueError("No photobooth captures received.")

        images_pil = []
        print(f"Decoding {num_shots} photobooth captures...")
        for key in capture_keys:
            data_url = request.form.get(key)
            if data_url:
                try: images_pil.append(decode_image_from_data_url(data_url))
                except ValueError as decode_err: print(f"Skipping invalid capture for key {key}: {decode_err}")
            else: print(f"Warning: Missing data URL for key {key}")
        if not images_pil: raise ValueError("Failed to decode any valid captures.")
        num_shots = len(images_pil) # Update based on successful decodes

        # Compose Images / Create GIF
        start_compose_time = time.time()
        composed_result, output_format = compose_photobooth_images(
            images_pil, layout, num_shots, create_gif, bg_color=(255, 255, 255), padding=10
        )
        compose_time = time.time() - start_compose_time
        print(f"Photobooth composition ({'GIF' if create_gif else layout}) took {compose_time:.2f} seconds.")

        # Encode Result to Data URL
        if create_gif:
             encoded_string = base64.b64encode(composed_result).decode('utf-8')
             result_data_url = f"data:image/gif;base64,{encoded_string}"
        elif composed_result:
             result_data_url = encode_image_to_data_url(composed_result, format=output_format.upper())
        else: raise RuntimeError("Composition failed to return a result.")

        # Prepare Response
        output_filename = f"photobooth_{layout}_{num_shots}shots.{output_format}"
        photobooths_created += 1 # Increment new counter
        total_req_time = time.time() - start_req_time
        print(f"Photobooth Request ID {error_uuid}: Total time: {total_req_time:.2f} seconds. Success.")
        return jsonify({
            'success': True, 'result_data_url': result_data_url, 'filename': output_filename,
            'effect_applied': 'photobooth', 'processing_time_seconds': round(compose_time, 2)
        })

    except Exception as e:
        total_req_time = time.time() - start_req_time
        print(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print(f"ERROR Processing Photobooth Request (ID: {error_uuid}, Total Time: {total_req_time:.2f}s)")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Details: {e}")
        traceback.print_exc()
        print(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        return jsonify({
            'success': False, 'error': 'Photobooth processing failed.',
            'details': f'An error occurred ({type(e).__name__}). Please try again. (Error ID: {error_uuid})',
        }), 500


# --- Routes for UI and Stats ---

@app.before_request
def track_visit():
    """Tracks unique visits using sessions."""
    global user_visits
    if 'visited' not in session:
        session['visited'] = True
        user_visits += 1

@app.route('/')
def index():
    """Renders the main photoshoot page."""
    if not session.sid: session.regenerate()
    effects_data = get_available_effects()
    return render_template('index.html', effects=effects_data, session_id=session.sid)

@app.route('/stats')
def show_stats():
    """(Admin/Debug) Shows basic usage stats."""
    # Consider adding authentication/authorization for production
    try:
        active_sessions = len(os.listdir(app.config["SESSION_FILE_DIR"]))
    except FileNotFoundError:
        active_sessions = 0 # Handle case where session dir doesn't exist yet

    return jsonify({
        'active_sessions_approx': active_sessions,
        'unique_visits_since_restart': user_visits,
        'single_effects_created_since_restart': photoshoots_created,
        'photobooths_created_since_restart': photobooths_created, # Added counter
        'ai_models_loaded': models_loaded
    })

# --- Setup Defaults & Main Execution ---

def setup_defaults():
    """Creates directories and a default style image on startup."""
    styles_dir = os.path.join(app.static_folder, 'styles')
    os.makedirs(styles_dir, exist_ok=True)
    default_style_path = os.path.join(styles_dir, 'default_style.jpg')
    os.makedirs(app.config["SESSION_FILE_DIR"], exist_ok=True) # Ensure session dir

    if not os.path.exists(default_style_path):
         print(f"Default style image not found, creating one at: {default_style_path}")
         try:
             img = Image.new('RGB', (256, 256))
             draw = ImageDraw.Draw(img)
             for i in range(256): draw.line([(0, i), (255, i)], fill=(i, 0, 255 - i)) # Blue-Red Gradient
             img.save(default_style_path, "JPEG")
             print(f"Created default style image.")
         except Exception as e: print(f"WARNING: Could not create default style image: {e}")


if __name__ == '__main__':
    setup_defaults()
    host = os.getenv('FLASK_RUN_HOST', '127.0.0.1') # Default to 127.0.0.1 for safety if not set
    port = int(os.getenv('FLASK_RUN_PORT', 5000))
    # Default debug to False unless explicitly set to 'true'
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() in ['true', '1', 't']

    print(f"--- Starting Flask App ---")
    print(f" * Host: {host}")
    print(f" * Port: {port}")
    print(f" * Debug Mode: {debug_mode}")
    print(f" * Session Directory: {app.config['SESSION_FILE_DIR']}")
    print(f" * Static Folder: {app.static_folder}")
    print(f" * AI Models Status: {models_loaded}")
    # Ensure link reflects host (use 127.0.0.1 if host is 0.0.0.0 for clickable link)
    display_host = '127.0.0.1' if host == '0.0.0.0' else host
    print(f"--- Access at http://{display_host}:{port}/ ---")

    # Use app.run() only for development. Use WSGI server (Gunicorn, uWSGI) for production.
    app.run(debug=debug_mode, host=host, port=port)