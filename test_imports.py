# advanced_test_imports.py
import sys
import time

def test_import(module_name, alias=None):
    print(f"Testing import for {module_name}...", end="")
    sys.stdout.flush()  # Ensure output appears immediately
    try:
        start_time = time.time()
        if alias:
            exec(f"import {module_name} as {alias}")
        else:
            exec(f"import {module_name}")
        end_time = time.time()
        print(f" ✅ Success ({(end_time - start_time):.2f}s)")
        return True
    except ImportError as e:
        print(f" ❌ Failed: {e}")
        return False

def test_from_import(module, component):
    print(f"Testing import for {component} from {module}...", end="")
    sys.stdout.flush()
    try:
        start_time = time.time()
        exec(f"from {module} import {component}")
        end_time = time.time()
        print(f" ✅ Success ({(end_time - start_time):.2f}s)")
        return True
    except ImportError as e:
        print(f" ❌ Failed: {e}")
        return False

# Basic imports
basic_modules = [
    "os", "uuid", "cv2", "numpy", "base64", "flask", 
    "flask_session", "dotenv"
]

# Advanced imports for the enhanced photoshoot app
advanced_modules = [
    "mediapipe", "tensorflow", "tensorflow_hub", "skimage"
]

# From imports
from_imports = [
    ("PIL", "Image, ImageFilter, ImageOps"),
    ("io", "BytesIO"),
    ("flask", "Flask, render_template, request, jsonify, session"),
    ("flask_session", "Session"),
    ("dotenv", "load_dotenv")
]

print("=== Testing Basic Imports ===")
basic_results = [test_import(module) for module in basic_modules]

print("\n=== Testing Advanced Imports ===")
advanced_results = [test_import(module) for module in advanced_modules]

print("\n=== Testing From Imports ===")
from_results = [test_from_import(module, components) for module, components in from_imports]

# Simple test for TensorFlow functionality
print("\n=== Testing TensorFlow Functionality ===")
try:
    import tensorflow as tf
    print(f"TensorFlow version: {tf.__version__}")
    print("Simple TF operation: 2+2 =", tf.add(2, 2).numpy())
    print("GPU Available:", tf.config.list_physical_devices('GPU'))
    print("✅ TensorFlow is working correctly")
except Exception as e:
    print(f"❌ TensorFlow test failed: {e}")

# Test MediaPipe basic functionality
print("\n=== Testing MediaPipe Functionality ===")
try:
    import mediapipe as mp
    print(f"MediaPipe version: {mp.__version__}")
    # Just check if we can access some commonly used solutions
    solutions = dir(mp.solutions)
    print(f"MediaPipe solutions available: {', '.join([s for s in solutions if not s.startswith('_')])}")
    print("✅ MediaPipe is accessible")
except Exception as e:
    print(f"❌ MediaPipe test failed: {e}")

# Summary
total_tests = len(basic_results) + len(advanced_results) + len(from_results)
passed_tests = sum(basic_results) + sum(advanced_results) + sum(from_results)
print("\n=== Summary ===")
print(f"Tests passed: {passed_tests}/{total_tests}")

if passed_tests == total_tests:
    print("✅ All imports successful! Your environment is correctly set up.")
else:
    print("❌ Some imports failed. Please install missing packages.")
    print("Run: pip install -r requirements.txt")