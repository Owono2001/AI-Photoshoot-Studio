// static/js/main.js (FULL CODE - Updated April 6, 2025)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const photoUploadInput = document.getElementById('photo_upload');
    const startWebcamButton = document.getElementById('start_webcam');
    const stopWebcamButton = document.getElementById('stop_webcam');
    const captureFrameButton = document.getElementById('capture_frame');
    const effectSelect = document.getElementById('effect_select');
    const applyEffectButton = document.getElementById('apply_effect_button');

    const webcamVideo = document.getElementById('webcam_video');
    const webcamCaptureCanvas = document.getElementById('webcam_capture_canvas'); // Used for captures, can be hidden
    const webcamArea = document.getElementById('webcam_area');
    const webcamWrapper = document.getElementById('webcam-wrapper');

    const sourceCanvasWrapper = document.getElementById('source_canvas_wrapper');
    const sourcePlaceholder = document.getElementById('source_placeholder');
    const resultCanvasWrapper = document.getElementById('result_canvas_wrapper');
    const processedPlaceholder = document.getElementById('processed_placeholder');

    const loadingIndicator = document.getElementById('loading_indicator'); // General spinner near result
    const processingTimeDiv = document.getElementById('processing_time');
    const downloadLink = document.getElementById('download_link');
    const effectParamsDiv = document.getElementById('effect_params');
    const errorMessageDiv = document.getElementById('error_message');

    // Fabric.js Controls
    const toolSelectButton = document.getElementById('tool_select');
    const toolDrawButton = document.getElementById('tool_draw');
    const drawColorInput = document.getElementById('draw_color');
    const drawWidthInput = document.getElementById('draw_width');
    const drawWidthValueSpan = document.getElementById('draw_width_value');
    const addTextButton = document.getElementById('tool_add_text');
    const deleteSelectedButton = document.getElementById('delete_selected');
    const clearEditsButton = document.getElementById('clear_canvas_edits');

    // --- ADD BACK Transformation Buttons ---
    const rotateLeftButton = document.getElementById('tool_rotate_left');
    const rotateRightButton = document.getElementById('tool_rotate_right');
    const flipHorizontalButton = document.getElementById('tool_flip_h');
    const flipVerticalButton = document.getElementById('tool_flip_v');
    const startCropButton = document.getElementById('tool_start_crop');
    const applyCropButton = document.getElementById('tool_apply_crop');
    const cancelCropButton = document.getElementById('tool_cancel_crop');
    // --- END ADD BACK ---
    

    // Photobooth Elements
    const startPhotoboothButton = document.getElementById('start_photobooth');
    const photoboothControlsDiv = document.getElementById('photobooth_controls');
    const photoboothStatusDiv = document.getElementById('photobooth_status');
    const photoboothCountdownVisualDiv = document.getElementById('photobooth_countdown_visual');
    const photoboothCountdownText = document.getElementById('photobooth_countdown_text');
    const photoboothCountdownCircle = photoboothControlsDiv?.querySelector('.timer-progress'); // Use optional chaining
    const photoboothSnapshotPreview = document.getElementById('photobooth_snapshot_preview');
    const cancelPhotoboothButton = document.getElementById('cancel_photobooth');
    const photoboothLayoutSelect = document.getElementById('photobooth_layout');
    const photoboothShotsSelect = document.getElementById('photobooth_shots');
    const photoboothGifCheckbox = document.getElementById('photobooth_gif');
    const photoboothFrameSelect = document.getElementById('photobooth_frame'); // ADDED
    const gifDurationOptionsDiv = document.getElementById('gif_duration_options'); // ADDED
    const gifDurationInput = document.getElementById('photobooth_gif_duration'); // ADDED
    const perShotEffectArea = document.getElementById('photobooth_per_shot_effect_area'); // ADDED
    const perShotEffectSelect = document.getElementById('photobooth_per_shot_effect'); // ADDED

    // Store original content for Apply button restoration
    let applyEffectButtonOriginalContent = applyEffectButton.innerHTML;

    // --- State Variables ---
    let currentStream = null;
    let sourceImageFilename = 'source_image.png';
    let isPhotoboothMode = false;
    let photoboothCaptures = []; // Stores RESIZED DataURLs
    let photoboothCurrentEffect = 'none'; // ADDED: To store effect choice before capture
    let photoboothTimer = null;
    let photoboothCountdownValue = 3;
    let photoboothShotsTaken = 0;
    let currentPhotoboothConfig = {};
    let isImageReady = false; // Track if source canvas has content
    let currentTool = 'select';

    // --- ADD BACK Cropping State ---
    let isCroppingMode = false;
    let cropRect = null; // Fabric.Rect object for the crop selection
    let cropOriginX, cropOriginY; // Keep track of starting point for drawing rect
    // let originalImageForCrop = null; // Maybe not needed if we use getElement()
    // --- END ADD BACK ---

    // --- Constants ---
    const PHOTOBOOTH_INITIAL_DELAY_MS = 1500;
    const PHOTOBOOTH_COUNTDOWN_SECONDS = 3;
    const PHOTOBOOTH_INTER_SHOT_DELAY_MS = 1000;
    const MAX_PROCESS_DIMENSION = 1920; // Max width/height for single effect processing
    const MAX_PHOTOBOOTH_SHOT_DIMENSION = 640; // Max width/height for individual photobooth shots


    // --- Fabric.js Initialization ---
    const initialCanvasWidth = sourceCanvasWrapper.offsetWidth > 0 ? sourceCanvasWrapper.offsetWidth - 4 : 500;
    const initialCanvasHeight = 400; // Base height, will be adjusted

    let sourceCanvas, resultCanvas; // Declare canvases

    try {
        sourceCanvas = new fabric.Canvas('source_canvas', {
            width: initialCanvasWidth,
            height: initialCanvasHeight,
            backgroundColor: '#ffffff', // Start with white bg before glass effect might make it transparent
            preserveObjectStacking: true,
            selectionColor: 'rgba(100, 100, 255, 0.3)',
            selectionLineWidth: 1,
            selectionBorderColor: 'rgba(100, 100, 255, 0.5)'
        });

        resultCanvas = new fabric.Canvas('result_canvas', {
            width: initialCanvasWidth,
            height: initialCanvasHeight,
            backgroundColor: 'rgba(0,0,0,0.05)', // Light bg for result placeholder
            selection: false, // Disable selection on result
        });
    } catch (error) {
         console.error("Error initializing Fabric.js canvas:", error);
         showError("Critical error: Canvas could not be initialized. Please refresh.", true);
         // Disable controls if canvas fails
         document.querySelector('.control-panel')?.classList.add('disabled-controls');
         return; // Stop further JS execution
    }


    // --- Fabric.js Tool State & Functions ---
    sourceCanvas.isDrawingMode = false;
    sourceCanvas.selection = true;

    function updateToolButtons() {
        document.querySelectorAll('.fabric-tool-btn').forEach(btn => btn.classList.remove('active'));
        if (currentTool === 'select') toolSelectButton?.classList.add('active');
        else if (currentTool === 'draw') toolDrawButton?.classList.add('active');

        if (sourceCanvas) {
            sourceCanvas.isDrawingMode = (currentTool === 'draw');
            sourceCanvas.selection = (currentTool === 'select');
            sourceCanvas.defaultCursor = (currentTool === 'draw') ? 'crosshair' : 'default';
            sourceCanvas.hoverCursor = (currentTool === 'draw') ? 'crosshair' : 'move';
            sourceCanvas.renderAll();
        }
    }

    // Function to scale and center an image as a Fabric.js canvas background OR object
    function resizeAndPositionImage(canvas, img, useBackground = true) {
        if (!canvas || !img || !img.width || !img.height) {
            console.error("Invalid canvas or image for resizeAndPositionImage");
            return;
        }
        // Use the canvas's current dimensions AFTER it has potentially been resized by CSS/Flexbox
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const imgWidth = img.width;
        const imgHeight = img.height;

        if (imgWidth <= 0 || imgHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
            console.error("Invalid dimensions for scaling", { imgWidth, imgHeight, canvasWidth, canvasHeight });
            return;
        }

        const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        const offsetX = (canvasWidth - scaledWidth) / 2;
        const offsetY = (canvasHeight - scaledHeight) / 2;

        if (useBackground) {
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                originX: 'left', originY: 'top',
                scaleX: scale, scaleY: scale,
                left: offsetX, top: offsetY,
                crossOrigin: 'anonymous' // Important for canvas export
            });
        } else {
            // Add as an object instead (useful for results if background shouldn't be cleared)
            const fabricImage = new fabric.Image(img.getElement(), {
                 left: offsetX, top: offsetY,
                 scaleX: scale, scaleY: scale,
                 selectable: false, evented: false, // Make it non-interactive on result
                 crossOrigin: 'anonymous'
            });
            canvas.add(fabricImage);
            canvas.centerObject(fabricImage); // Center it precisely
        }
        canvas.renderAll();
    }


    // Function to resize the Fabric canvas element to fit its wrapper dimensions
    function resizeFabricCanvas(canvasInstance, wrapperElement) {
        if (!canvasInstance || !wrapperElement) return;

        const newWidth = wrapperElement.offsetWidth > 0 ? wrapperElement.offsetWidth - 4 : 500; // Account for border
        const newHeight = wrapperElement.offsetHeight > 0 ? wrapperElement.offsetHeight - 4 : 400; // Use wrapper's actual height

        // Only resize if dimensions actually changed significantly to avoid minor loops
        if (Math.abs(canvasInstance.width - newWidth) > 1 || Math.abs(canvasInstance.height - newHeight) > 1) {
            console.log(`Resizing canvas ${canvasInstance.lowerCanvasEl.id} to ${newWidth}x${newHeight}`);
            canvasInstance.setWidth(newWidth);
            canvasInstance.setHeight(newHeight);
            canvasInstance.calcOffset(); // Recalculate canvas position relative to document

            // Re-apply background/objects scaling/positioning if they exist
            const bgImage = canvasInstance.backgroundImage;
            if (bgImage) {
                // Need the original Fabric Image object to pass to resizeAndPositionImage
                // This assumes bgImage IS a Fabric Image object
                resizeAndPositionImage(canvasInstance, bgImage, true);
            } else {
                 // If using objects instead of background, re-center/scale them?
                 // This might be complex; often background is easier for static results.
                 // For simplicity, just render. Add object rescaling logic if needed.
                canvasInstance.renderAll();
            }
        }
    }


    // Debounced resize handler for window resize events AND OBSERVE wrappers
    let resizeTimeout;
    const debounceResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            console.log("Debounced resize triggered, adjusting canvases...");
            // Crucially, pass the WRAPPER element, not the canvas element
            if (sourceCanvas && sourceCanvasWrapper) resizeFabricCanvas(sourceCanvas, sourceCanvasWrapper);
            if (resultCanvas && resultCanvasWrapper) resizeFabricCanvas(resultCanvas, resultCanvasWrapper);
        }, 250); // Wait 250ms after last resize event
    };

    window.addEventListener('resize', debounceResize);

    // Use ResizeObserver for more reliable detection of wrapper changes
    if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(debounceResize);
        if (sourceCanvasWrapper) observer.observe(sourceCanvasWrapper);
        if (resultCanvasWrapper) observer.observe(resultCanvasWrapper);
        console.log("ResizeObserver attached to canvas wrappers.");
    } else {
        console.warn("ResizeObserver not supported, relying on window resize events.");
    }


     // --- Helper function to resize Data URL (using a temporary canvas) ---
     /**
      * Resizes an image represented by a DataURL.
      * @param {string} dataUrl The input image DataURL.
      * @param {number} maxWidth Max width for the output.
      * @param {number} maxHeight Max height for the output.
      * @param {function(string|null)} callback Function called with the resized DataURL or null on error.
      */
     function resizeDataUrl(dataUrl, maxWidth, maxHeight, callback) {
        // Input validation
        if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
            console.error("Invalid DataURL provided for resizing:", dataUrl ? dataUrl.substring(0, 30) + '...' : 'null');
            showError("Invalid image data provided for resizing.");
            // Ensure callback is always called asynchronously even on early exit
            setTimeout(() => callback(null), 0);
            return;
        }
        if (maxWidth <= 0 || maxHeight <= 0) {
             console.error("Invalid dimensions provided for resizing:", {maxWidth, maxHeight});
             showError("Invalid target dimensions for resizing.");
             setTimeout(() => callback(null), 0);
             return;
        }

        const img = new Image();

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                let originalWidth = img.width;
                let originalHeight = img.height;

                if (originalWidth <= 0 || originalHeight <= 0) {
                    throw new Error(`Invalid source image dimensions loaded: ${originalWidth}x${originalHeight}`);
                }

                // Calculate scaling factor - ensures image is not scaled up (Math.min includes 1)
                const scaleFactor = Math.min(maxWidth / originalWidth, maxHeight / originalHeight, 1);

                // Calculate new dimensions, ensuring they are at least 1px
                const newWidth = Math.max(1, Math.round(originalWidth * scaleFactor));
                const newHeight = Math.max(1, Math.round(originalHeight * scaleFactor));

                canvas.width = newWidth;
                canvas.height = newHeight;

                // Draw image scaled onto the temporary canvas
                // Improves quality for downscaling compared to default
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                // Get the resized Data URL as JPEG for potentially smaller size in transfers
                const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9); // Quality 0.9

                // Validate output from toDataURL
                if (!resizedDataUrl || resizedDataUrl === "data:,") {
                    throw new Error("Canvas toDataURL failed or returned empty/invalid data after resize.");
                }

                console.log(`Resized image from ${originalWidth}x${originalHeight} to ${newWidth}x${newHeight} (JPEG)`);
                callback(resizedDataUrl); // Success

            } catch (error) {
                console.error("Error during image resizing canvas operation:", error);
                showError(`Image resizing failed: ${error.message || 'Unknown canvas error'}`);
                callback(null); // Indicate failure
            }
        };

        img.onerror = (event) => {
            // Log the specific error if possible, check event details
            console.error("Failed to load image for resizing (img.onerror). Event:", event);
            showError("Failed to load image for resizing. It might be corrupted, an unsupported format, or a network issue.");
            callback(null); // Indicate failure
        };

        // Handle potential SecurityErrors or other issues when setting src
        try {
            img.crossOrigin = "anonymous"; // Attempt to enable CORS for the image loading
            img.src = dataUrl;
        } catch (error) {
            console.error("Error setting image src for resizing (potential CORS or invalid URL):", error);
            showError(`Failed to initiate image loading for resizing: ${error.message}`);
            // Ensure callback is called asynchronously
            setTimeout(() => callback(null), 0);
        }
   }


    // --- Core App Logic & Event Listeners ---

    // Function to update visual theme based on selected effect category
    function updateEffectVisuals(effectKey) {
        const effectData = availableEffectsData[effectKey];
        const category = effectData?.category || 'none';
        const bodyClasses = document.body.classList;
        // Remove previous category classes efficiently
        const classesToRemove = Array.from(bodyClasses).filter(c => c.startsWith('effect-category-'));
        bodyClasses.remove(...classesToRemove);
        // Add new category class
        bodyClasses.add(`effect-category-${category || 'none'}`);
        console.log(`Applied body class: effect-category-${category || 'none'}`);
    }

    // Function to update the readiness state for the Apply button
    function updateApplyButtonReadiness() {
        // Ready if source canvas has a background image OR any objects added
        isImageReady = !!(sourceCanvas?.backgroundImage || sourceCanvas?.getObjects().length > 0);
        const isLoading = applyEffectButton?.classList.contains('loading');

        if (!applyEffectButton) return; // Safety check

        if (isImageReady && !isLoading) { // Only enable and mark ready if NOT loading
            applyEffectButton.classList.add('ready-to-apply');
            applyEffectButton.disabled = false;
        } else {
            applyEffectButton.classList.remove('ready-to-apply');
            // Disable if no image OR if loading
            applyEffectButton.disabled = !isImageReady || isLoading;
        }
         console.log(`Apply button readiness: ${isImageReady}, isLoading: ${isLoading}, Button enabled: ${!applyEffectButton.disabled}`);
    }

    // File Upload Listener
    photoUploadInput.addEventListener('change', (event) => {
        console.log("Upload input changed!"); // <-- ADDED
        const file = event.target.files[0];
        if (!file) {
            console.log("No file selected."); // <-- ADDED
            return;
        }
        console.log("File selected:", file.name, file.type, file.size); // <-- ADDED

        // Optional: Client-side size check BEFORE reading
        const MAX_UPLOAD_MB = 100; // Match server limit roughly
        if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
            showError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max ${MAX_UPLOAD_MB}MB allowed.`, true);
            photoUploadInput.value = ''; // Clear selection
            return;
        }

        if (file.type.startsWith('image/')) {
            sourceImageFilename = file.name;
            const reader = new FileReader();

            reader.onload = (e) => {
                console.log("FileReader onload triggered."); // <-- ADDED
                const dataUrl = e.target.result;
                if (!dataUrl) {
                    console.error("FileReader result is empty!"); // <-- ADDED Error Check
                    showError("Failed to read file data.");
                    return;
                }
                console.log("Data URL created (first 50 chars):", dataUrl.substring(0, 50)); // <-- ADDED

                fabric.Image.fromURL(dataUrl, (img) => {
                    console.log("Fabric.Image.fromURL callback entered."); // <-- ADDED
                    if (!img || !img.width) { // Check if image object is valid
                        console.error("Fabric failed to load image from Data URL or image has no width."); // <-- ADDED Error Check
                        showError("Failed to load image onto canvas.");
                        return;
                    }

                    if (!sourceCanvas || !sourceCanvasWrapper) {
                        console.error("Source canvas or wrapper not found in Fabric callback."); // <-- ADDED Error Check
                        return;
                    }
                    console.log("Clearing source canvas and setting background..."); // <-- ADDED

                    sourceCanvas.clear();
                    sourceCanvas.backgroundColor = '#ffffff';
                    resizeFabricCanvas(sourceCanvas, sourceCanvasWrapper);
                    resizeAndPositionImage(sourceCanvas, img, true); // Use as background

                    sourcePlaceholder.style.display = 'none';
                    sourceCanvasWrapper.classList.add('has-content');

                    clearResultCanvas();
                    stopWebcam(); // Stop webcam if it was running
                    if (isPhotoboothMode) cancelPhotoboothSequence("File Uploaded");
                    currentTool = 'select';
                    updateToolButtons();
                    clearError();
                    updateApplyButtonReadiness();
                    console.log("Image successfully loaded onto canvas."); // <-- ADDED

                }, { crossOrigin: 'anonymous' });
            }

            reader.onerror = (err) => {
                console.error("FileReader error:", err); // Keep this
                showError("Error reading file.");
                clearSourceCanvas();
            };

            console.log("Calling reader.readAsDataURL..."); // <-- ADDED
            reader.readAsDataURL(file);

        } else {
            showError("Invalid file type. Please upload an image (PNG, JPG, WEBP).");
            photoUploadInput.value = '';
            updateApplyButtonReadiness();
        }
    });

    // Webcam Start
    async function startWebcam(isForPhotobooth = false) {
        if (currentStream) return true;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
             showError("Webcam access not supported by this browser.");
             return false;
        }
        console.log("Attempting to start webcam...");
        try {
            // Try to get a reasonable resolution, but accept browser default if specific ones fail
            const constraints = {
                 video: {
                     facingMode: 'user',
                     width: { ideal: 640 }, // Request ideal width
                     height: { ideal: 480 } // Request ideal height
                 },
                 audio: false
            };
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            webcamVideo.srcObject = currentStream;
            // Wait for metadata to ensure dimensions are available if needed shortly after
            await new Promise((resolve) => { webcamVideo.onloadedmetadata = resolve; });
            await webcamVideo.play();
            console.log("Webcam started successfully.");

            webcamArea.style.display = 'block';
            if (webcamWrapper) webcamWrapper.style.display = 'flex';
            startWebcamButton.disabled = true;
            stopWebcamButton.disabled = false;
            captureFrameButton.disabled = isPhotoboothMode; // Disable single capture if starting for photobooth
            startPhotoboothButton.disabled = false;
            startPhotoboothButton.title = "Start the photobooth sequence!";

            if (!isForPhotobooth) {
                clearSourceCanvas();
                photoUploadInput.value = '';
                sourceImageFilename = 'webcam_capture.png';
            }
            clearError();
            return true;

        } catch (error) {
            console.error("Error accessing webcam:", error.name, error.message);
            let userMessage = `Could not access webcam: ${error.message}.`;
            if (error.name === 'NotAllowedError') {
                userMessage = "Webcam permission denied. Please allow camera access in your browser settings and refresh.";
            } else if (error.name === 'NotFoundError') {
                 userMessage = "No compatible webcam found. Ensure it's connected and not in use by another application.";
            } else if (error.name === 'NotReadableError') {
                 userMessage = "Webcam is already in use or hardware error occurred.";
            }
            showError(userMessage, true); // Make permission errors persistent
            webcamArea.style.display = 'none';
            if (webcamWrapper) webcamWrapper.style.display = 'none';
            stopWebcam(); // Cleanup
            startPhotoboothButton.disabled = true;
            startPhotoboothButton.title = "Webcam failed or not supported.";
            return false;
        }
    }
    startWebcamButton.addEventListener('click', () => startWebcam(false));

    // Webcam Stop
    function stopWebcam() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            console.log("Webcam stream stopped.");
        }
        webcamVideo.srcObject = null;
        currentStream = null;
        webcamArea.style.display = 'none';
        if (webcamWrapper) webcamWrapper.style.display = 'none';
        startWebcamButton.disabled = false;
        stopWebcamButton.disabled = true;
        captureFrameButton.disabled = true;
        startPhotoboothButton.disabled = true;
        startPhotoboothButton.title = "Start webcam to use photobooth.";
        if (isPhotoboothMode) {
            cancelPhotoboothSequence("Webcam was stopped.");
        }
    }
    stopWebcamButton.addEventListener('click', stopWebcam);


    // Capture Frame (Single) - Gets raw capture, Apply button resizes later
    function captureFrameToDataURL() {
         if (!currentStream || webcamVideo.readyState < 4) { // Check for HAVE_ENOUGH_DATA
             console.error("Webcam stream not ready or not available for capture.");
             showError("Webcam not ready. Please wait a moment.");
             return null;
         }
         const videoWidth = webcamVideo.videoWidth;
         const videoHeight = webcamVideo.videoHeight;
         if (!videoWidth || !videoHeight || videoWidth <= 0 || videoHeight <= 0) {
            console.error("Webcam video dimensions are invalid for capture.", {videoWidth, videoHeight});
            showError("Cannot get webcam dimensions.");
            return null;
         }

         const captureContext = webcamCaptureCanvas.getContext('2d');
         webcamCaptureCanvas.width = videoWidth;
         webcamCaptureCanvas.height = videoHeight;
         try {
            captureContext.drawImage(webcamVideo, 0, 0, videoWidth, videoHeight);
            // Capture as PNG initially for best quality before potential resize
            return webcamCaptureCanvas.toDataURL('image/png');
         } catch (e) {
             console.error("Error drawing or converting capture canvas to DataURL:", e);
             showError("Failed to capture frame. Webcam might be busy or disconnected.");
             return null;
         }
    }

    captureFrameButton.addEventListener('click', () => {
        if (currentStream) {
            const frameDataUrl = captureFrameToDataURL(); // Get raw capture
            if (frameDataUrl) {
                sourceImageFilename = `webcam_${Date.now()}.png`; // Unique name
                // Load onto main canvas for editing
                fabric.Image.fromURL(frameDataUrl, (img) => {
                    if (!sourceCanvas || !sourceCanvasWrapper) return;
                    sourceCanvas.clear();
                    sourceCanvas.backgroundColor = '#ffffff';

                    // Resize canvas first
                    resizeFabricCanvas(sourceCanvas, sourceCanvasWrapper);
                    // Then place image
                    resizeAndPositionImage(sourceCanvas, img, true); // Use as background

                    sourcePlaceholder.style.display = 'none';
                     sourceCanvasWrapper.classList.add('has-content');

                    clearResultCanvas();
                    if(isPhotoboothMode) cancelPhotoboothSequence("Manual Capture Initiated");
                    currentTool = 'select';
                    updateToolButtons();
                    clearError();
                    updateApplyButtonReadiness(); // Image is ready now
                }, { crossOrigin: 'anonymous' });
            }
            // Error message handled within captureFrameToDataURL if capture fails
        } else {
            showError("Webcam not active.");
            updateApplyButtonReadiness();
        }
    });

    // Effect Selection
    effectSelect.addEventListener('change', () => {
        updateEffectParametersUI();
        updateEffectVisuals(effectSelect.value);
    });

    // Fabric.js Controls Listeners (with safety checks for sourceCanvas)
    toolSelectButton?.addEventListener('click', () => { currentTool = 'select'; updateToolButtons(); });
    toolDrawButton?.addEventListener('click', () => {
         if (!sourceCanvas) return;
         currentTool = 'draw';
         sourceCanvas.freeDrawingBrush.color = drawColorInput.value;
         sourceCanvas.freeDrawingBrush.width = parseInt(drawWidthInput.value, 10);
         updateToolButtons();
    });
    drawColorInput?.addEventListener('input', () => {
        if (!sourceCanvas) return;
        const color = drawColorInput.value;
        sourceCanvas.freeDrawingBrush.color = color;
        const activeObject = sourceCanvas.getActiveObject();
        if (activeObject?.set) {
             if (activeObject.type === 'path') activeObject.set('stroke', color);
             else if (activeObject.type === 'i-text') activeObject.set('fill', color);
             sourceCanvas.renderAll();
        }
    });
    drawWidthInput?.addEventListener('input', () => {
        if (!sourceCanvas) return;
        const width = parseInt(drawWidthInput.value, 10);
        sourceCanvas.freeDrawingBrush.width = width;
        if (drawWidthValueSpan) drawWidthValueSpan.textContent = width;
        const activeObject = sourceCanvas.getActiveObject();
        if (activeObject?.type === 'path' && activeObject.set) {
            activeObject.set('strokeWidth', width);
            sourceCanvas.renderAll();
        }
    });
    if (drawWidthValueSpan) drawWidthValueSpan.textContent = drawWidthInput.value;

    addTextButton?.addEventListener('click', () => {
        if (!sourceCanvas) return;
        const text = new fabric.IText('Type here', {
            left: sourceCanvas.width / 2 - 60, top: sourceCanvas.height / 2 - 20,
            fill: drawColorInput.value, fontSize: 24, fontFamily: 'Arial', padding: 5,
            borderColor: 'rgba(100, 100, 255, 0.5)', cornerColor: 'rgba(100, 100, 255, 0.8)',
            cornerSize: 8, transparentCorners: false,
        });
        sourceCanvas.add(text);
        sourceCanvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        currentTool = 'select';
        updateToolButtons();
        sourceCanvas.renderAll();
        updateApplyButtonReadiness();
    });

    deleteSelectedButton?.addEventListener('click', () => {
        if (!sourceCanvas) return;
        const activeObjects = sourceCanvas.getActiveObjects();
        if (activeObjects.length > 0) {
            activeObjects.forEach(obj => sourceCanvas.remove(obj));
            sourceCanvas.discardActiveObject();
            sourceCanvas.renderAll();
            updateApplyButtonReadiness();
        }
    });

    clearEditsButton?.addEventListener('click', () => {
        if (!sourceCanvas) return;
        if (!sourceCanvas.backgroundImage && sourceCanvas.getObjects().length === 0) {
             showError("Nothing to clear."); return;
        }
         if (confirm("Clear all drawings and text added? (Base image remains)")) {
             const objectsToRemove = sourceCanvas.getObjects().filter(obj => obj.type !== 'image'); // Keep potential bg image if added as object
             objectsToRemove.forEach(obj => sourceCanvas.remove(obj));
             sourceCanvas.renderAll();
             updateApplyButtonReadiness();
         }
    });


    // --- Rotate Logic ---
    function rotateCanvasBackground(degrees) {
        if (!sourceCanvas || !isImageReady) return;
        const bgImage = sourceCanvas.backgroundImage;
        if (!bgImage || !bgImage.set) {
            showError("No background image found to rotate.");
            return;
        }
        const currentAngle = typeof bgImage.angle === 'number' ? bgImage.angle : 0;
        const newAngle = currentAngle + degrees;
        bgImage.set({ angle: newAngle });
        sourceCanvas.centerObject(bgImage); // Attempt to re-center
        sourceCanvas.renderAll();
        console.log(`Rotated background image to ${newAngle} degrees`);
        updateApplyButtonReadiness();
    }

    rotateLeftButton?.addEventListener('click', () => {
        if (isCroppingMode) { showError("Cannot rotate while cropping."); return; }
        rotateCanvasBackground(-90);
    });

    rotateRightButton?.addEventListener('click', () => {
        if (isCroppingMode) { showError("Cannot rotate while cropping."); return; }
        rotateCanvasBackground(90);
    });

    // --- Flip Logic ---
    function flipCanvasBackground(axis) { // axis should be 'X' or 'Y'
        if (!sourceCanvas || !isImageReady) return;
        const bgImage = sourceCanvas.backgroundImage;
        if (!bgImage || !bgImage.set) {
            showError("No background image found to flip.");
            return;
        }
        if (axis === 'X') {
            bgImage.set({ flipX: !bgImage.flipX });
            console.log(`Flipped background horizontally: ${bgImage.flipX}`);
        } else if (axis === 'Y') {
            bgImage.set({ flipY: !bgImage.flipY });
            console.log(`Flipped background vertically: ${bgImage.flipY}`);
        }
        sourceCanvas.renderAll();
        updateApplyButtonReadiness();
    }

    flipHorizontalButton?.addEventListener('click', () => {
         if (isCroppingMode) { showError("Cannot flip while cropping."); return; }
         flipCanvasBackground('X');
    });

    flipVerticalButton?.addEventListener('click', () => {
         if (isCroppingMode) { showError("Cannot flip while cropping."); return; }
         flipCanvasBackground('Y');
    });

    // Function to toggle UI elements for cropping mode
    function setCroppingUI(enable) {
        isCroppingMode = enable;
        if (enable) {
            startCropButton?.classList.add('cropping'); // Indicate active crop mode

            // --- CORRECTED LINES ---
            if (applyCropButton) {
                applyCropButton.style.display = 'inline-block';
                applyCropButton.disabled = !cropRect; // Disable apply until rect is drawn (or immediately if cropRect is null)
            }
            if (cancelCropButton) {
                 cancelCropButton.style.display = 'inline-block';
            }
            // --- END CORRECTED LINES ---

            // Disable other tools
            toolSelectButton?.classList.remove('active');
            toolDrawButton?.classList.remove('active');
            if (sourceCanvas) {
                sourceCanvas.isDrawingMode = false;
                sourceCanvas.selection = false; // Disable object selection
                sourceCanvas.defaultCursor = 'crosshair';
                sourceCanvas.hoverCursor = 'crosshair';
                sourceCanvas.discardActiveObject(); // Deselect any selected objects
                sourceCanvas.renderAll();
            }
            // Disable transformation and editing buttons during crop
            [toolDrawButton, addTextButton, deleteSelectedButton, clearEditsButton, rotateLeftButton, rotateRightButton, flipHorizontalButton, flipVerticalButton].forEach(btn => { if (btn) btn.disabled = true; });
        } else {
            startCropButton?.classList.remove('cropping');

            // --- CORRECTED LINES ---
            if (applyCropButton) {
                 applyCropButton.style.display = 'none';
            }
            if (cancelCropButton) {
                 cancelCropButton.style.display = 'none';
            }
             // --- END CORRECTED LINES ---

            if (cropRect && sourceCanvas) {
                sourceCanvas.remove(cropRect); // Remove visual crop rectangle
            }
            cropRect = null; // Reset crop rectangle object

            if (sourceCanvas) {
                sourceCanvas.defaultCursor = 'default';
                sourceCanvas.hoverCursor = 'move'; // Or default depending on selected tool
                sourceCanvas.selection = (currentTool === 'select'); // Re-enable selection if appropriate
                sourceCanvas.renderAll();
            }
            // Re-enable transformation and editing buttons
            [toolDrawButton, addTextButton, deleteSelectedButton, clearEditsButton, rotateLeftButton, rotateRightButton, flipHorizontalButton, flipVerticalButton].forEach(btn => { if (btn) btn.disabled = false; });
            // Restore active state of previously selected tool if needed (e.g., select tool)
            updateToolButtons();
        }
    }

    startCropButton?.addEventListener('click', () => {
        if (!sourceCanvas || !isImageReady) {
             showError("Please load an image before cropping.");
             return;
        }
        if (isCroppingMode) return;
        console.log("Starting crop mode");
        setCroppingUI(true);
    });

    cancelCropButton?.addEventListener('click', () => {
        if (!isCroppingMode) return;
        console.log("Cancelling crop mode");
        setCroppingUI(false);
    });

    applyCropButton?.addEventListener('click', () => {
        if (!isCroppingMode || !cropRect || !sourceCanvas || !sourceCanvas.backgroundImage) {
            showError("No valid crop area selected or no background image.");
            setCroppingUI(false);
            return;
        }
        console.log("Applying crop...");
        try {
            const bgImage = sourceCanvas.backgroundImage;
            const cropZone = {
                left: cropRect.left,
                top: cropRect.top,
                width: cropRect.getScaledWidth(),
                height: cropRect.getScaledHeight()
            };
            const bgScaleX = bgImage.scaleX || 1;
            const bgScaleY = bgImage.scaleY || 1;
            const bgOffsetX = bgImage.left || 0;
            const bgOffsetY = bgImage.top || 0;

             if (bgImage.angle !== 0 || bgImage.flipX || bgImage.flipY) {
                 console.warn("Cropping a rotated/flipped background may yield unexpected results.");
             }

            const relativeCropX = (cropZone.left - bgOffsetX);
            const relativeCropY = (cropZone.top - bgOffsetY);
            const originalCropX = relativeCropX / bgScaleX;
            const originalCropY = relativeCropY / bgScaleY;
            const originalCropWidth = cropZone.width / bgScaleX;
            const originalCropHeight = cropZone.height / bgScaleY;

            const originalImgElement = bgImage.getElement();
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

             if (originalCropWidth <= 0 || originalCropHeight <= 0) {
                  throw new Error("Invalid crop dimensions calculated.");
             }

            tempCanvas.width = originalCropWidth;
            tempCanvas.height = originalCropHeight;

            tempCtx.drawImage(
                originalImgElement,
                originalCropX, originalCropY,
                originalCropWidth, originalCropHeight,
                0, 0,
                originalCropWidth, originalCropHeight
            );

            const croppedDataUrl = tempCanvas.toDataURL('image/png');

            sourceCanvas.clear();
            sourceCanvas.backgroundColor = '#ffffff';

            fabric.Image.fromURL(croppedDataUrl, (newCroppedImg) => {
                 if (!sourceCanvas || !sourceCanvasWrapper) return;
                 resizeFabricCanvas(sourceCanvas, sourceCanvasWrapper);
                 resizeAndPositionImage(sourceCanvas, newCroppedImg, true);
                 sourcePlaceholder.style.display = 'none';
                 sourceCanvasWrapper.classList.add('has-content');
                 isImageReady = true;
                 updateApplyButtonReadiness();
                 console.log("Crop applied successfully.");
            }, { crossOrigin: 'anonymous' });

        } catch (error) {
             console.error("Error applying crop:", error);
             showError(`Failed to apply crop: ${error.message}`);
        } finally {
             setCroppingUI(false);
        }
    });

    // Mouse events for drawing crop rectangle
     if(sourceCanvas) {
        sourceCanvas.on('mouse:down', (o) => {
            if (!isCroppingMode || o.target === cropRect) return;
            if (cropRect) sourceCanvas.remove(cropRect);

            const pointer = sourceCanvas.getPointer(o.e);
            cropOriginX = pointer.x;
            cropOriginY = pointer.y;

            cropRect = new fabric.Rect({ /* ... rect options ... */ });
            // --- Same rect options as before ---
             cropRect = new fabric.Rect({
                left: cropOriginX, top: cropOriginY, width: 0, height: 0,
                fill: 'rgba(0, 0, 0, 0.3)', stroke: 'rgba(255, 255, 255, 0.8)',
                strokeWidth: 1, strokeDashArray: [5, 5],
                selectable: false, evented: false, transparentCorners: true,
            });
            // --- End rect options ---
            sourceCanvas.add(cropRect);
            applyCropButton.disabled = true;
        });

        sourceCanvas.on('mouse:move', (o) => {
            if (!isCroppingMode || !cropRect || !cropOriginX) return;
            const pointer = sourceCanvas.getPointer(o.e);
            let width = pointer.x - cropOriginX;
            let height = pointer.y - cropOriginY;
            let newLeft = cropOriginX; let newTop = cropOriginY;
            if (width < 0) { newLeft = pointer.x; width = Math.abs(width); }
            if (height < 0) { newTop = pointer.y; height = Math.abs(height); }

            cropRect.set({ left: newLeft, top: newTop, width: width, height: height });
            sourceCanvas.renderAll();
            applyCropButton.disabled = (width < 5 || height < 5);
        });

        sourceCanvas.on('mouse:up', (o) => {
             if (!isCroppingMode || !cropRect) return;
             const finalWidth = cropRect.width; const finalHeight = cropRect.height;
             applyCropButton.disabled = (finalWidth < 5 || finalHeight < 5);
             if (applyCropButton.disabled && cropRect) { // Also check cropRect exists
                  console.log("Crop rectangle too small, removing.");
                  sourceCanvas.remove(cropRect);
                  cropRect = null;
             } else if (cropRect) { // Check cropRect exists before logging
                  console.log("Crop rectangle drawn:", cropRect.left, cropRect.top, cropRect.width, cropRect.height);
             }
             cropOriginX = null; cropOriginY = null; // Reset origins
        });
    } // End if(sourceCanvas)


    // --- Add Event Listener for GIF Checkbox ---
    photoboothGifCheckbox?.addEventListener('change', () => {
        if (gifDurationOptionsDiv) {
            gifDurationOptionsDiv.style.display = photoboothGifCheckbox.checked ? 'flex' : 'none';
        }
    });


    // Apply Effect Button (Main /process route) - Handles resizing before calling sendProcessRequest
    applyEffectButton?.addEventListener('click', () => {
        if (!sourceCanvas) { showError("Canvas not ready."); return; }
        if (!isImageReady) { showError("Please load an image first!"); return; }
        if (isPhotoboothMode) { showError("Cannot apply effects during Photobooth."); return; }

        showLoading(true, "Preparing image..."); // Show loading before export/resize

        let originalDataUrl;
        try {
            // Export high quality from Fabric
            originalDataUrl = sourceCanvas.toDataURL({
                format: 'png', // Use PNG from canvas
                multiplier: 1 // Use current display size multiplier (usually 1)
                // quality: 0.95 // Quality mainly applies to JPEG
            });
        } catch (error) {
             console.error("Error exporting source canvas:", error);
             showError(`Failed to export canvas image: ${error.message}`);
             showLoading(false);
             return;
        }

        if (!originalDataUrl || originalDataUrl === "data:,") {
             showError("Failed to get image data from canvas.");
             showLoading(false);
             return;
        }

        // Resize before sending
        resizeDataUrl(originalDataUrl, MAX_PROCESS_DIMENSION, MAX_PROCESS_DIMENSION, (resizedDataUrl) => {
            if (!resizedDataUrl) {
                // Error shown by resizeDataUrl
                showLoading(false); // Turn off loading if resize failed
                return;
            }

            // --- Prepare FormData with RESIZED data ---
            showLoading(true, "Applying effect..."); // Update status message

            const selectedEffect = effectSelect.value;
            const formData = new FormData();
            formData.append('effect', selectedEffect);

            // Append parameters
            const paramInputs = effectParamsDiv.querySelectorAll('input, select');
            paramInputs.forEach(input => {
                if (input.name && !input.disabled) { // Check if not disabled
                    if (input.type === 'file' && input.files.length > 0) {
                        formData.append(input.name, input.files[0]);
                    } else if (input.type === 'checkbox') {
                        formData.append(input.name, input.checked);
                    } else if (input.type !== 'file') {
                        formData.append(input.name, input.value);
                    }
                }
            });

            // Append RESIZED image data
            formData.append('image_data_url', resizedDataUrl);

            // Call the function that handles the fetch API call
            sendProcessRequest(formData);
        });
    });


    // --- Photobooth Logic ---
    startPhotoboothButton?.addEventListener('click', () => {
        if (!currentStream) { showError("Please start the webcam first!"); return; }
        if (isPhotoboothMode) { console.warn("Photobooth already active."); return; }
        initiatePhotoboothSequence();
    });

    cancelPhotoboothButton?.addEventListener('click', () => {
        if (isPhotoboothMode) { cancelPhotoboothSequence("Sequence cancelled by user."); }
    });

    function initiatePhotoboothSequence() {
        if (!photoboothControlsDiv || !photoboothLayoutSelect || !photoboothShotsSelect || !photoboothGifCheckbox) {
             console.error("Photobooth UI elements missing.");
             showError("Photobooth UI is not ready.");
             return;
        }
        console.log("Starting Photobooth Sequence");
        isPhotoboothMode = true;
        photoboothCaptures = []; // Stores RESIZED URLs
        photoboothShotsTaken = 0;
        clearError();
        clearResultCanvas();
        photoboothSnapshotPreview.innerHTML = '';

        currentPhotoboothConfig = {
            layout: photoboothLayoutSelect.value,
            shots: parseInt(photoboothShotsSelect.value, 10),
            createGif: photoboothGifCheckbox.checked,
            frame: photoboothFrameSelect.value, // ADDED
            gifDuration: photoboothGifCheckbox.checked ? parseInt(gifDurationInput.value, 10) : 500 // ADDED
        };
        console.log("Photobooth Config:", currentPhotoboothConfig);


         // --- ADDED: Populate Per-Shot Effect Dropdown ---
         if (perShotEffectSelect) {
            perShotEffectSelect.innerHTML = ''; // Clear existing
            const simpleEffects = { // Define simple effects suitable for per-shot
                'none': 'None',
                'grayscale': 'Grayscale',
                'sepia': 'Sepia',
                'invert': 'Invert Colors'
                // Add other fast/simple effects here if desired
            };
            for (const effectKey in simpleEffects) {
                const option = document.createElement('option');
                option.value = effectKey;
                option.textContent = simpleEffects[effectKey];
                perShotEffectSelect.appendChild(option);
            }
            perShotEffectSelect.value = 'none'; // Default to 'none'
        }
        if (perShotEffectArea) {
             perShotEffectArea.style.display = 'flex'; // Show the dropdown
        }
        // --- END ADDED ---

        photoboothControlsDiv.style.display = 'block';
        cancelPhotoboothButton.style.display = 'inline-block';
        photoboothStatusDiv.textContent = "Get Ready...";
        photoboothCountdownVisualDiv.style.display = 'none';

        // Disable other controls
        showLoading(true, "Photobooth Active..."); // Use general loading state to disable most controls
        startPhotoboothButton.disabled = true; // Keep start disabled
        startPhotoboothButton.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Active...`;
        // showLoading already disables photobooth config options

        setTimeout(() => {
            if (isPhotoboothMode) runPhotoboothCountdown();
        }, PHOTOBOOTH_INITIAL_DELAY_MS);
    }

    function runPhotoboothCountdown() {
        if (!isPhotoboothMode || !photoboothCountdownCircle) return;


        // --- ADDED: Read effect for the upcoming shot ---
        photoboothCurrentEffect = perShotEffectSelect.value;
        console.log(`Effect selected for shot ${photoboothShotsTaken + 1}: ${photoboothCurrentEffect}`);
        // --- END ADDED ---

        photoboothCountdownValue = PHOTOBOOTH_COUNTDOWN_SECONDS;
        photoboothStatusDiv.textContent = `Taking shot ${photoboothShotsTaken + 1} of ${currentPhotoboothConfig.shots}...`;
        photoboothCountdownVisualDiv.style.display = 'block';
        photoboothCountdownText.textContent = photoboothCountdownValue;
        photoboothCountdownText.parentElement?.classList.remove('photobooth-capture-flash');

        // Reset and start SVG timer animation
        photoboothCountdownCircle.style.transition = 'none';
        photoboothCountdownCircle.style.strokeDashoffset = 283;
        photoboothCountdownCircle.getBoundingClientRect(); // Force reflow
        photoboothCountdownCircle.style.transition = `stroke-dashoffset ${PHOTOBOOTH_COUNTDOWN_SECONDS}s linear`;
        photoboothCountdownCircle.style.strokeDashoffset = 0;

        photoboothTimer = setInterval(() => {
            if (!isPhotoboothMode) { clearInterval(photoboothTimer); photoboothTimer = null; return; }
            photoboothCountdownValue--;
            photoboothCountdownText.textContent = photoboothCountdownValue > 0 ? photoboothCountdownValue : '📸';

            if (photoboothCountdownValue < 0) {
                clearInterval(photoboothTimer); photoboothTimer = null;
                takePhotoboothSnapshot();
            }
        }, 1000);
    }

    function takePhotoboothSnapshot() {
        if (!isPhotoboothMode || !photoboothCountdownText?.parentElement) return;
        console.log(`Taking snapshot ${photoboothShotsTaken + 1}`);
        photoboothCountdownText.textContent = "SNAP!";
        photoboothCountdownText.parentElement.classList.add('photobooth-capture-flash');

        setTimeout(() => { // Delay for SNAP visibility
            if (!isPhotoboothMode) return; // Check if cancelled during SNAP display

            const frameDataUrl = captureFrameToDataURL(); // Capture raw frame

            if (frameDataUrl) {
                photoboothStatusDiv.textContent = `Processing shot ${photoboothShotsTaken + 1}...`;

                // Resize the captured frame before storing
                resizeDataUrl(frameDataUrl, MAX_PHOTOBOOTH_SHOT_DIMENSION, MAX_PHOTOBOOTH_SHOT_DIMENSION, (resizedShotDataUrl) => {
                    // ---- Start of Updated Callback ----
                    if (!isPhotoboothMode) {
                        console.log("Photobooth cancelled during resize, discarding shot.");
                        return; // Check again after async resize, exit if cancelled
                    }
                    if (!resizedShotDataUrl) {
                        showError(`Failed to process snapshot ${photoboothShotsTaken + 1}. Stopping photobooth.`);
                        cancelPhotoboothSequence("Snapshot processing failed");
                        return; // Stop if resizing failed
                    }

                    // Store the result as an object including the effect chosen *before* the shot
                    photoboothCaptures.push({
                        dataUrl: resizedShotDataUrl,
                        effect: photoboothCurrentEffect // photoboothCurrentEffect was set in runPhotoboothCountdown
                    });
                    photoboothShotsTaken++;
                    console.log(`Stored shot ${photoboothShotsTaken} with effect: ${photoboothCurrentEffect}`);

                    // Display thumbnail preview
                    if (photoboothSnapshotPreview) {
                        const thumb = document.createElement('img');
                        thumb.src = resizedShotDataUrl;
                        thumb.alt = `Snapshot ${photoboothShotsTaken}`;
                        thumb.title = `Shot ${photoboothShotsTaken} (Effect: ${photoboothCurrentEffect})`;
                        thumb.onload = () => { thumb.classList.add('loaded'); }; // Fade in animation via CSS
                        photoboothSnapshotPreview.appendChild(thumb);
                    }

                    // Check if more shots are needed or finish
                    if (photoboothShotsTaken < currentPhotoboothConfig.shots) {
                        photoboothCountdownVisualDiv.style.display = 'none'; // Hide timer between shots
                        photoboothStatusDiv.textContent = `Shot ${photoboothShotsTaken} ready! Next...`;
                        // Show effect selector for the *next* shot
                        if(perShotEffectArea) perShotEffectArea.style.display = 'flex';
                        // Schedule the next countdown
                        setTimeout(() => {
                             if (isPhotoboothMode) runPhotoboothCountdown();
                        }, PHOTOBOOTH_INTER_SHOT_DELAY_MS);
                    } else {
                        // All shots taken
                        photoboothCountdownVisualDiv.style.display = 'none';
                        if(perShotEffectArea) perShotEffectArea.style.display = 'none'; // Hide selector
                        photoboothStatusDiv.textContent = "All shots captured! Composing...";
                        sendPhotoboothDataToBackend(); // Send data to backend for final composition
                    }
                    // ---- End of Updated Callback ----
                }); // End resizeDataUrl callback

            } else {
                // captureFrameToDataURL failed (error already shown inside that function)
                showError("Failed to capture snapshot. Stopping photobooth.");
                cancelPhotoboothSequence("Capture failed");
            }
        }, 150); // Short delay after "SNAP!" before processing
    }

    // Sends finalized (resized) photobooth data to the backend for composition.
    function sendPhotoboothDataToBackend() {
        if (!isPhotoboothMode) {
             console.warn("Attempted to send photobooth data when not in photobooth mode.");
             return;
        }
        if (!photoboothCaptures || photoboothCaptures.length === 0) {
             showError("No captures available to send for photobooth composition.");
             cancelPhotoboothSequence("No captures");
             return;
        }

        console.log(`Sending ${photoboothCaptures.length} RESIZED photobooth captures to backend...`);
        // Use general loading state, update specific status text
        showLoading(true, "Composing your photobooth creation..."); // Disables most controls
        if (photoboothStatusDiv) photoboothStatusDiv.textContent = "Composing your creation...";

        // Create FormData object to send data
        const formData = new FormData();

        // Append configuration options
        formData.append('layout', currentPhotoboothConfig.layout);
        formData.append('shots', String(photoboothCaptures.length)); // Send actual number of successful captures
        formData.append('create_gif', String(currentPhotoboothConfig.createGif)); // Send as string 'true'/'false'
        formData.append('frame_choice', currentPhotoboothConfig.frame); // Send selected frame filename ('none' if no frame)

        // Append GIF duration only if creating a GIF
        if (currentPhotoboothConfig.createGif) {
            const duration = Math.max(100, currentPhotoboothConfig.gifDuration || 500); // Ensure minimum duration
            formData.append('gif_duration', String(duration));
        }

        // Append structured capture data (DataURL and Effect for each shot)
        photoboothCaptures.forEach((capture, index) => {
             if (capture && capture.dataUrl) {
                 // Key format expected by Flask backend based on previous update
                 formData.append(`captures[${index}][dataUrl]`, capture.dataUrl);
                 formData.append(`captures[${index}][effect]`, capture.effect || 'none'); // Default to 'none' if missing
             } else {
                 console.warn(`Skipping invalid capture data structure at index ${index}`);
             }
        });

        // --- Send data using Fetch API ---
        fetch('/photobooth_process', { method: 'POST', body: formData })
            .then(response => {
                 // Improved response handling: Check content type before assuming JSON
                 const contentType = response.headers.get("content-type");
                 if (!response.ok) {
                     // If not OK and not JSON, try to get text error
                     if (!contentType || contentType.indexOf("application/json") === -1) {
                          return response.text().then(text => {
                               console.error(`Server error (non-JSON): ${response.status} - ${text}`);
                               throw new Error(`Server error ${response.status}: ${text.substring(0, 100)}...`);
                          });
                     }
                     // If not OK but looks like JSON, parse it for error details
                     return response.json().then(data => {
                         console.error("Server processing error (JSON):", data);
                         throw new Error(data.details || data.error || `Server error ${response.status}`);
                     });
                 }
                 // If OK, assume JSON response
                 return response.json();
            })
            .then(data => {
                 // Process successful JSON response
                 if (data.success && data.result_data_url) {
                     console.log("Photobooth composition successful:", data.filename);
                     if (photoboothStatusDiv) photoboothStatusDiv.textContent = "Done! ✨";

                     // Display the final composed image/GIF on the result canvas
                     fabric.Image.fromURL(data.result_data_url, (img) => {
                         if (!resultCanvas || !resultCanvasWrapper) return;
                         clearResultCanvas(false); // Clear placeholder but keep canvas ready

                         // Resize result canvas wrapper *before* placing image
                         resizeFabricCanvas(resultCanvas, resultCanvasWrapper);
                         // Display the result, scaled to fit
                         resizeAndPositionImage(resultCanvas, img, true); // Use background for result

                         processedPlaceholder.style.display = 'none';
                         resultCanvasWrapper.classList.add('has-content');

                         // Update download link
                         downloadLink.href = data.result_data_url;
                         downloadLink.download = data.filename || 'photobooth_result';
                         downloadLink.style.display = 'block'; // Show download button

                         // Show processing time
                         if (data.processing_time_seconds !== undefined && processingTimeDiv) {
                             processingTimeDiv.textContent = `Created in ${data.processing_time_seconds.toFixed(2)}s`;
                             processingTimeDiv.style.display = 'block';
                         }
                         clearError(); // Clear any previous errors
                     }, { crossOrigin: 'anonymous' });

                     // Clean up photobooth UI state after success
                     cancelPhotoboothSequence("Success");

                 } else {
                     // Handle cases where backend returns success:false or unexpected format
                     console.error("Photobooth backend returned success=false or invalid data:", data);
                     throw new Error(data.error || data.details || 'Processing failed on server (unexpected response).');
                 }
            })
            .catch(error => {
                 // Catch fetch errors, network errors, or errors thrown from response handling
                 console.error('Error during photobooth processing request:', error);
                 showError(`Photobooth failed: ${error.message || 'Network error or server unreachable'}`);
                 if (photoboothStatusDiv) photoboothStatusDiv.textContent = "Processing Failed!";
                 clearResultCanvas(true); // Show placeholder on error

                 // Clean up photobooth UI state on error
                 cancelPhotoboothSequence("Processing Error");
            })
            .finally(() => {
                 // Always runs, regardless of success or failure
                 showLoading(false); // Hide general loading indicator and re-enable controls
            });
    }

    // Cleanup function for photobooth mode - resets UI and state
    function cancelPhotoboothSequence(reason = "Cancelled") {
        if (!isPhotoboothMode) return; // Only run if mode is active

        console.log(`Stopping Photobooth Mode: ${reason}`);
        isPhotoboothMode = false;
        clearInterval(photoboothTimer); // Clear any active countdown timer
        photoboothTimer = null;
        photoboothCaptures = []; // Clear captured data
        photoboothShotsTaken = 0;
        photoboothCurrentEffect = 'none'; // Reset effect selection

        // Hide active photobooth UI elements
        if (photoboothControlsDiv) photoboothControlsDiv.style.display = 'none';
        if (cancelPhotoboothButton) cancelPhotoboothButton.style.display = 'none';
        if (photoboothSnapshotPreview) photoboothSnapshotPreview.innerHTML = ''; // Clear thumbnails
        if (perShotEffectArea) perShotEffectArea.style.display = 'none'; // Hide per-shot effect selector

        // Reset countdown timer visual state (if elements exist)
        if (photoboothCountdownCircle) {
            photoboothCountdownCircle.style.transition = 'none'; // Stop any ongoing animation
            photoboothCountdownCircle.style.strokeDashoffset = 283; // Reset to start
        }
        if(photoboothCountdownText) photoboothCountdownText.textContent = PHOTOBOOTH_COUNTDOWN_SECONDS; // Reset text
        if(photoboothCountdownVisualDiv) photoboothCountdownVisualDiv.style.display = 'none'; // Hide timer


        // Re-evaluate and set the state of main controls (using showLoading handles most of this)
        // Call showLoading(false) which re-enables controls based on current state (e.g., webcam status)
        showLoading(false);

        // Explicitly ensure photobooth start button text/state is correct if webcam is still running
         if (startPhotoboothButton) {
             if (currentStream) {
                 startPhotoboothButton.disabled = false;
                 startPhotoboothButton.innerHTML = `<i class="fas fa-photo-film"></i> Start Photobooth`;
                 startPhotoboothButton.title = "Start the photobooth sequence!";
             } else {
                  startPhotoboothButton.disabled = true;
                  startPhotoboothButton.innerHTML = `<i class="fas fa-photo-film"></i> Start Photobooth`;
                  startPhotoboothButton.title = "Start webcam to use photobooth.";
             }
         }
         // Re-enable parameter inputs for photobooth options
         if(photoboothLayoutSelect) photoboothLayoutSelect.disabled = false;
         if(photoboothShotsSelect) photoboothShotsSelect.disabled = false;
         if(photoboothFrameSelect) photoboothFrameSelect.disabled = false;
         if(photoboothGifCheckbox) photoboothGifCheckbox.disabled = false;
         if(gifDurationInput) gifDurationInput.disabled = false; // Re-enable GIF duration if needed

        console.log("Photobooth sequence controls reset.");
    }


    // Simplified sendProcessRequest (called by Apply button handler AFTER resizing)
    // Handles fetch and result display for the /process endpoint
    function sendProcessRequest(formData) {
        // Assumes showLoading(true) was called before this function
        fetch('/process', { method: 'POST', body: formData })
            .then(response => { // Basic response handling
                const contentType = response.headers.get("content-type");
                if (!response.ok && (!contentType || contentType.indexOf("application/json") === -1)) {
                     return response.text().then(text => { throw new Error(`Server error: ${response.status} - ${text}`); });
                }
                return response.json().then(data => ({ ok: response.ok, status: response.status, data }));
            })
            .then(({ ok, status, data }) => { // Process JSON data
                if (!ok) { throw new Error(data.details || data.error || `HTTP error: ${status}`); }

                if (data.success && data.processed_data_url) {
                    // Display successful result
                    fabric.Image.fromURL(data.processed_data_url, (img) => {
                        clearResultCanvas(false); // Clear placeholder

                        // Resize canvas first
                        resizeFabricCanvas(resultCanvas, resultCanvasWrapper);
                        // Then place result image
                        resizeAndPositionImage(resultCanvas, img, true); // Use background

                        processedPlaceholder.style.display = 'none';
                        resultCanvasWrapper.classList.add('has-content');

                        downloadLink.href = data.processed_data_url;
                        const effectKey = effectSelect.value;
                        const effectName = (availableEffectsData[effectKey]?.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase()) || effectKey;
                        const baseFilename = sourceImageFilename.substring(0, sourceImageFilename.lastIndexOf('.')) || 'image';
                        downloadLink.download = `${baseFilename}_${effectName}.png`;
                        downloadLink.style.display = 'block'; // Changed to 'block' or 'inline-block'

                        if (data.processing_time_seconds !== undefined) {
                            processingTimeDiv.textContent = `Effect applied in ${data.processing_time_seconds.toFixed(2)}s`;
                            processingTimeDiv.style.display = 'block';
                        }
                        clearError(); // Clear previous errors
                    }, { crossOrigin: 'anonymous' });
                } else {
                    throw new Error(data.error || 'Processing failed (unexpected success format).');
                }
            })
            .catch(error => { // Catch fetch/processing errors
                console.error('Error applying effect:', error);
                showError(`Failed to apply effect: ${error.message}`);
                clearResultCanvas(true); // Show placeholder on error
            })
            .finally(() => { // Always run
                showLoading(false); // Turn off loading state
            });
    }


    // --- UI Helper Functions ---

    function clearSourceCanvas() {
        if (!sourceCanvas || !sourceCanvasWrapper) return;
        sourceCanvas.clear();
        sourceCanvas.backgroundColor = '#ffffff'; // Reset background

        // Resize canvas to fit wrapper (important after clearing)
        resizeFabricCanvas(sourceCanvas, sourceCanvasWrapper);

        sourceCanvas.renderAll();
        if(sourcePlaceholder) sourcePlaceholder.style.display = 'flex';
        sourceCanvasWrapper.classList.remove('has-content');

        updateApplyButtonReadiness(); // Update button state
    }

    function clearResultCanvas(showPlaceholder = true) {
        if (!resultCanvas || !resultCanvasWrapper) return;
        resultCanvas.clear();
        resultCanvas.backgroundColor = 'rgba(0,0,0,0.05)';

        // Resize canvas to fit wrapper (important after clearing)
        resizeFabricCanvas(resultCanvas, resultCanvasWrapper);

        resultCanvas.renderAll();
        if(processedPlaceholder) processedPlaceholder.style.display = showPlaceholder ? 'flex' : 'none';
        if(showPlaceholder) resultCanvasWrapper.classList.remove('has-content'); // Only remove class if showing placeholder

        if(downloadLink) downloadLink.style.display = 'none';
        if(processingTimeDiv) processingTimeDiv.style.display = 'none';
    }


    // Updated showLoading to robustly manage control disabling/enabling
    function showLoading(isLoading, message = "Processing... ✨") {
        // Store original content only if starting to load and not already stored
        if (isLoading && applyEffectButton && !applyEffectButton.classList.contains('loading')) {
             applyEffectButton.dataset.originalContent = applyEffectButton.innerHTML;
        }

        if (isLoading) {
            if (loadingIndicator) {
                const loadingText = loadingIndicator.querySelector('.loading-text');
                if(loadingText) loadingText.textContent = message;
                loadingIndicator.style.display = 'flex';
            }
            if (applyEffectButton) {
                applyEffectButton.classList.add('loading');
                applyEffectButton.disabled = true;
                applyEffectButton.innerHTML = '<div class="spinner small"></div>';
            }

            // Disable all major controls
            [photoUploadInput, startWebcamButton, stopWebcamButton, captureFrameButton,
             effectSelect, startPhotoboothButton, photoboothLayoutSelect,
             photoboothShotsSelect, photoboothGifCheckbox, addTextButton,
             deleteSelectedButton, clearEditsButton, toolDrawButton, toolSelectButton]
             .forEach(el => { if(el) el.disabled = true; });

        } else {
            if(loadingIndicator) loadingIndicator.style.display = 'none';

            if (applyEffectButton) {
                applyEffectButton.classList.remove('loading');
                const originalContent = applyEffectButton.dataset.originalContent || applyEffectButtonOriginalContent; // Use stored or default
                if (originalContent) {
                     applyEffectButton.innerHTML = originalContent;
                }
                 if (applyEffectButton.dataset.originalContent) {
                      delete applyEffectButton.dataset.originalContent; // Clean up
                 }
                 // Apply button disabled state is handled by updateApplyButtonReadiness below
            }

            // Re-enable controls, considering the current app state (webcam on/off, photobooth active/inactive)
            if(photoUploadInput) photoUploadInput.disabled = isPhotoboothMode;
            if(startWebcamButton) startWebcamButton.disabled = !!currentStream || isPhotoboothMode;
            if(stopWebcamButton) stopWebcamButton.disabled = !currentStream || isPhotoboothMode;
            if(captureFrameButton) captureFrameButton.disabled = !currentStream || isPhotoboothMode;
            if(effectSelect) effectSelect.disabled = isPhotoboothMode;
            if(startPhotoboothButton) startPhotoboothButton.disabled = !currentStream || isPhotoboothMode; // Can only start if webcam running and not already in photobooth
            if(photoboothLayoutSelect) photoboothLayoutSelect.disabled = isPhotoboothMode;
            if(photoboothShotsSelect) photoboothShotsSelect.disabled = isPhotoboothMode;
            if(photoboothGifCheckbox) photoboothGifCheckbox.disabled = isPhotoboothMode;
             // Re-enable fabric tools only if not in photobooth
             [addTextButton, deleteSelectedButton, clearEditsButton, toolDrawButton, toolSelectButton]
             .forEach(el => { if(el) el.disabled = isPhotoboothMode; });


             // Crucially, re-evaluate apply button disabled state based on image readiness AFTER other states are reset
             updateApplyButtonReadiness();
        }
    }

    function showError(message, persistent = false) {
        if (!errorMessageDiv) return;
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
        console.error("App Error Displayed:", message);
        // Clear non-persistent errors after a delay
        if (!persistent) {
            setTimeout(clearError, 7000); // Increased delay to 7 seconds
        }
    }

    function clearError() {
         if (!errorMessageDiv) return;
        errorMessageDiv.textContent = '';
        errorMessageDiv.style.display = 'none';
    }

    // Function to dynamically populate effect parameters UI
    function updateEffectParametersUI() {
        if (!effectSelect || !effectParamsDiv) return;
        const selectedEffect = effectSelect.value;
        const effectData = availableEffectsData[selectedEffect];
        effectParamsDiv.innerHTML = ''; // Clear previous
        effectParamsDiv.style.display = 'none';

        const paramsContainerParent = document.getElementById('effect_params_group')?.querySelector('.params-details');

        if (effectData?.params && Object.keys(effectData.params).length > 0) {
            effectParamsDiv.style.display = 'flex'; // Use flex from container style
            let hasVisibleParam = false;
            for (const paramName in effectData.params) {
                 const paramConfig = effectData.params[paramName];
                 const paramItem = document.createElement('div');
                 paramItem.className = 'param-item';
                 const label = document.createElement('label');
                 label.htmlFor = `param_${paramName}`;
                 label.textContent = paramConfig.label || paramName;
                 let inputElement;
                 let valueDisplay;

                 switch (paramConfig.type) {
                     case 'range':
                         inputElement = document.createElement('input');
                         inputElement.type = 'range'; inputElement.min = paramConfig.min; inputElement.max = paramConfig.max; inputElement.value = paramConfig.value; inputElement.step = paramConfig.step || 1;
                         valueDisplay = document.createElement('span'); valueDisplay.className = 'param-value'; valueDisplay.textContent = inputElement.value;
                         inputElement.oninput = () => { if(valueDisplay) valueDisplay.textContent = inputElement.value; };
                         paramItem.appendChild(label); paramItem.appendChild(inputElement); paramItem.appendChild(valueDisplay);
                         break;
                     case 'select':
                         const selectWrapper = document.createElement('div'); // Add wrapper for styling consistency
                         selectWrapper.className = 'select-wrapper';
                         inputElement = document.createElement('select');
                         if (paramConfig.options) {
                             for (const optionValue in paramConfig.options) {
                                 const option = document.createElement('option'); option.value = optionValue; option.textContent = paramConfig.options[optionValue]; if (optionValue == paramConfig.value) option.selected = true; inputElement.appendChild(option); // Use == for value comparison just in case
                             }
                         }
                         selectWrapper.appendChild(inputElement);
                         // Add dropdown arrow if needed (copy from main effect select)
                         const arrow = document.createElement('i');
                         arrow.className = 'fas fa-chevron-down dropdown-arrow';
                         selectWrapper.appendChild(arrow);
                         paramItem.appendChild(label); paramItem.appendChild(selectWrapper);
                         break;
                     case 'color':
                         inputElement = document.createElement('input'); inputElement.type = 'color'; inputElement.value = paramConfig.value;
                         paramItem.appendChild(label); paramItem.appendChild(inputElement);
                         break;
                     case 'file':
                         inputElement = document.createElement('input'); inputElement.type = 'file'; if (paramConfig.accept) inputElement.accept = paramConfig.accept;
                         // Style file input better if needed, maybe wrap in a button-like label
                         paramItem.appendChild(label); paramItem.appendChild(inputElement);
                         break;
                     case 'checkbox':
                         inputElement = document.createElement('input'); inputElement.type = 'checkbox'; inputElement.checked = paramConfig.value || false;
                         paramItem.appendChild(inputElement); // Checkbox first
                         label.style.flexBasis = 'auto'; // Allow label to take remaining space
                         label.style.marginLeft = '5px';
                         paramItem.appendChild(label); // Then label
                         break;
                     default: // number or text
                         inputElement = document.createElement('input'); inputElement.type = paramConfig.type === 'number' ? 'number' : 'text';
                         if (paramConfig.type === 'number') { if (paramConfig.min !== undefined) inputElement.min = paramConfig.min; if (paramConfig.max !== undefined) inputElement.max = paramConfig.max; if (paramConfig.step !== undefined) inputElement.step = paramConfig.step; } inputElement.value = paramConfig.value;
                         paramItem.appendChild(label); paramItem.appendChild(inputElement);
                 }
                 if (inputElement) { inputElement.id = `param_${paramName}`; inputElement.name = paramName; hasVisibleParam = true; }
                 if (paramConfig.hint) { const hint = document.createElement('small'); hint.className = 'param-hint'; hint.textContent = paramConfig.hint; paramItem.appendChild(hint); }
                 effectParamsDiv.appendChild(paramItem);
            }

            if (!hasVisibleParam) {
                 effectParamsDiv.innerHTML = '<div class="param-item"><small>(No adjustable parameters)</small></div>';
                 effectParamsDiv.style.display = 'block'; // Keep visible to show message
                 if (paramsContainerParent) paramsContainerParent.removeAttribute('open'); // Close details if no params
            } else {
                 if (paramsContainerParent && !paramsContainerParent.hasAttribute('open')) {
                    paramsContainerParent.setAttribute('open', ''); // Open details if params exist
                 }
            }

        } else {
            effectParamsDiv.innerHTML = '<div class="param-item"><small>(No adjustable parameters)</small></div>';
            effectParamsDiv.style.display = 'block'; // Keep visible
            if (paramsContainerParent) paramsContainerParent.removeAttribute('open'); // Close details
        }
    }


    // --- (Optional) Initialize tsParticles ---
    function initParticles() {
        // Check if the library is loaded
        if (typeof tsParticles !== 'undefined') {
             tsParticles.load("particles-js", { // Target the div#particles-js
                fpsLimit: 60,
                particles: {
                    number: { value: 40, density: { enable: true, value_area: 800 } }, // Reduced density
                    color: { value: "#aaaaaa" }, // Subtle color
                    shape: { type: "circle" },
                    opacity: { value: 0.3, random: true, anim: { enable: true, speed: 0.4, opacity_min: 0.1, sync: false } }, // More subtle
                    size: { value: 2, random: true }, // Smaller size
                    line_linked: { enable: true, distance: 130, color: "#bbbbbb", opacity: 0.2, width: 1 }, // Even more subtle lines
                    move: { enable: true, speed: 1, direction: "none", random: true, straight: false, out_mode: "out", bounce: false }
                },
                interactivity: {
                    detect_on: "canvas", events: { onhover: { enable: true, mode: "repulse" }, onclick: { enable: false }, resize: true },
                    modes: { repulse: { distance: 60, duration: 0.4 } }
                },
                detectRetina: true
            }).then(container => {
                 console.log("tsParticles initialized successfully.");
            }).catch(error => {
                 console.error("tsParticles initialization error:", error);
            });
        } else {
            console.warn("tsParticles library not found. Skipping particle background. Add CDN link to HTML if desired.");
            // Ensure the placeholder div doesn't interfere if library isn't loaded
            const particlesDiv = document.getElementById('particles-js');
            if (particlesDiv) particlesDiv.style.display = 'none';
        }
    }
    // --- End tsParticles Init ---


    // --- Initial Application Setup ---
    function initializeApp() {
        console.log("Initializing App...");
        if (!sourceCanvas || !resultCanvas) {
             console.error("Canvas objects not ready, cannot fully initialize.");
             return; // Prevent further setup if canvas failed
        }
        updateEffectParametersUI();
        updateToolButtons();

        // Initial resize after DOM is ready and CSS applied
        debounceResize(); // Trigger initial resize calculation

        clearResultCanvas();
        if(sourcePlaceholder) sourcePlaceholder.style.display = 'flex';
        if(processedPlaceholder) processedPlaceholder.style.display = 'flex';
        clearError();
        if(effectSelect) updateEffectVisuals(effectSelect.value); // Set initial theme
        updateApplyButtonReadiness(); // Set initial apply button state

        // Initial button states
        if(stopWebcamButton) stopWebcamButton.disabled = true;
        if(captureFrameButton) captureFrameButton.disabled = true;
        if(cancelPhotoboothButton) cancelPhotoboothButton.style.display = 'none';
        if(photoboothControlsDiv) photoboothControlsDiv.style.display = 'none';

        // Check webcam support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if(startWebcamButton) startWebcamButton.disabled = true;
            if(startPhotoboothButton) startPhotoboothButton.disabled = true;
            if(startWebcamButton) startWebcamButton.title = "Webcam not supported";
            if(startPhotoboothButton) startPhotoboothButton.title = "Webcam not supported";
            console.warn("Webcam API not supported by this browser.");
        } else {
             if(startPhotoboothButton) {
                 startPhotoboothButton.disabled = true; // Disabled until webcam starts
                 startPhotoboothButton.title = "Start webcam to use photobooth.";
            }
        }

        // Initialize particles if the element exists and library loaded
        if (document.getElementById('particles-js')) {
             initParticles();
        }

        console.log("App Initialized.");
    }

    initializeApp(); // Run the main initialization function

}); // End DOMContentLoaded