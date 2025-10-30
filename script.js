const overlayInput = document.getElementById('overlayInput');
const backgroundInput = document.getElementById('backgroundInput');
const mergeButton = document.getElementById('mergeButton');
const mergedImagePreviews = document.getElementById('mergedImagePreviews');
const downloadZipLink = document.getElementById('downloadZipLink');

// --- Configuration ---
const OVERLAY_WIDTH = 720;
const OVERLAY_HEIGHT = 1565; // Transparent image size

// The area on the canvas where the background image will be drawn
const CANVAS_BACKGROUND_AREA_X = 0;
const CANVAS_BACKGROUND_AREA_Y = 0;
const CANVAS_BACKGROUND_AREA_WIDTH = 720; // Background fills this width on canvas
const CANVAS_BACKGROUND_AREA_HEIGHT = 1424; // Background fills this height on canvas

// Cropping from the *source* background image
const BACKGROUND_SOURCE_CROP_LEFT = 41; // Pixels to cut from the left of original bg image
const BACKGROUND_SOURCE_CROP_RIGHT = 41; // Pixels to cut from the right of original bg image

const JPG_QUALITY = 0.9; // JPG compression quality (0.0 to 1.0)
// --- End Configuration ---


mergeButton.addEventListener('click', function() {
    const overlayFile = overlayInput.files[0];
    const backgroundFiles = backgroundInput.files;

    // Clear previous previews and hide download link
    mergedImagePreviews.innerHTML = '';
    downloadZipLink.style.display = 'none';
    downloadZipLink.href = '#';

    if (!overlayFile || backgroundFiles.length === 0) {
        alert("Please select a transparent overlay and at least one background image.");
        return;
    }

    const overlayReader = new FileReader();
    overlayReader.onload = function(overlayEvent) {
        const overlayImage = new Image();
        overlayImage.onload = function() {

            // Validate overlay dimensions
            if (overlayImage.width !== OVERLAY_WIDTH || overlayImage.height !== OVERLAY_HEIGHT) {
                alert(`Overlay image must be ${OVERLAY_WIDTH}x${OVERLAY_HEIGHT} pixels.`);
                return;
            }

            // Create a JSZip instance
            const zip = new JSZip();
            let imagesProcessedCount = 0; // Track how many images have been processed

            // Function to process each background image
            const processBackgroundImage = (backgroundFile) => {
                const backgroundReader = new FileReader();
                const originalFilename = backgroundFile.name.replace(/\.[^/.]+$/, ""); // Remove extension

                backgroundReader.onload = function(backgroundEvent) {
                    const backgroundImage = new Image();
                    backgroundImage.onload = function() {
                        const canvas = document.createElement('canvas');
                        canvas.width = OVERLAY_WIDTH;
                        canvas.height = OVERLAY_HEIGHT;
                        const ctx = canvas.getContext('2d');

                        // --- Background Drawing Logic ---

                        // 1. Define the source region to be taken from the original background image
                        const bgSourceCropX = BACKGROUND_SOURCE_CROP_LEFT;
                        const bgSourceCropY = 0;
                        const bgSourceCropWidth = backgroundImage.width - BACKGROUND_SOURCE_CROP_LEFT - BACKGROUND_SOURCE_CROP_RIGHT;
                        const bgSourceCropHeight = backgroundImage.height;

                        // Check for valid crop dimensions to prevent errors with very small images
                        if (bgSourceCropWidth <= 0 || bgSourceCropHeight <= 0) {
                            console.warn(`Background image ${backgroundFile.name} is too small for specified crop. Skipping.`);
                            imagesProcessedCount++; // Increment to avoid blocking zip creation
                            if (imagesProcessedCount === backgroundFiles.length) {
                                zip.generateAsync({type:"blob"}).then(function(content) {
                                    const url = URL.createObjectURL(content);
                                    downloadZipLink.href = url;
                                    downloadZipLink.download = "merged_images.zip";
                                    downloadZipLink.style.display = 'block';
                                });
                            }
                            return; // Skip this image
                        }


                        // 2. Calculate how this cropped source region scales to fit the CANVAS_BACKGROUND_AREA_WIDTH (720px)
                        const scaleFactor = CANVAS_BACKGROUND_AREA_WIDTH / bgSourceCropWidth;
                        const scaledBgHeight = bgSourceCropHeight * scaleFactor;

                        // 3. Determine the actual source (srcX, srcY, srcWidth, srcHeight) for drawImage
                        //    and the destination (destX, destY, destWidth, destHeight) on the canvas.
                        let srcX = bgSourceCropX;
                        let srcY = bgSourceCropY;
                        let srcWidth = bgSourceCropWidth;
                        let srcHeight = bgSourceCropHeight;

                        let destX = CANVAS_BACKGROUND_AREA_X;
                        let destY = CANVAS_BACKGROUND_AREA_Y;
                        let destWidth = CANVAS_BACKGROUND_AREA_WIDTH;
                        let destHeight = CANVAS_BACKGROUND_AREA_HEIGHT; // The fixed 1424px target height

                        // Adjust source Y and height for vertical centering/cropping if scaled height exceeds 1424px
                        if (scaledBgHeight > CANVAS_BACKGROUND_AREA_HEIGHT) {
                            const cropAmountPx = (scaledBgHeight - CANVAS_BACKGROUND_AREA_HEIGHT) / scaleFactor / 2;
                            srcY += cropAmountPx;
                            srcHeight -= (cropAmountPx * 2);
                        } else {
                            // If scaled height is shorter than CANVAS_BACKGROUND_AREA_HEIGHT,
                            // we center it within the 1424px space by adjusting destY.
                            // The destHeight will be the scaledBgHeight itself, not 1424.
                            destY = CANVAS_BACKGROUND_AREA_Y + (CANVAS_BACKGROUND_AREA_HEIGHT - scaledBgHeight) / 2;
                            destHeight = scaledBgHeight;
                        }

                        // Draw the background image onto the canvas
                        ctx.drawImage(
                            backgroundImage,    // Source image object
                            srcX,               // Source X from original image
                            srcY,               // Source Y from original image
                            srcWidth,           // Source Width from original image
                            srcHeight,          // Source Height from original image
                            destX,              // Destination X on canvas (0)
                            destY,              // Destination Y on canvas (0, or adjusted for centering)
                            destWidth,          // Destination Width on canvas (720)
                            destHeight          // Destination Height on canvas (scaled height, or 1424 if cropped)
                        );

                        // Clear any parts of the 1424px height that the image might not cover if it's shorter and not filling
                        // This prevents issues if the image is too short to fill the 1424px area and destY is not 0
                        ctx.clearRect(0, CANVAS_BACKGROUND_AREA_Y, CANVAS_BACKGROUND_AREA_WIDTH, destY - CANVAS_BACKGROUND_AREA_Y);
                        ctx.clearRect(0, destY + destHeight, CANVAS_BACKGROUND_AREA_WIDTH, CANVAS_BACKGROUND_AREA_HEIGHT - (destY + destHeight));

                        // --- End Background Drawing Logic ---

                        // Draw overlay image on top
                        ctx.drawImage(overlayImage, 0, 0);

                        // Generate merged image data URL
                        const dataUrl = canvas.toDataURL('image/jpeg', JPG_QUALITY);

                        // Create preview
                        const previewItem = document.createElement('div');
                        previewItem.className = 'merged-preview-item';
                        const previewImg = document.createElement('img');
                        previewImg.src = dataUrl;
                        previewImg.alt = `Merged Image ${originalFilename}`;
                        const previewName = document.createElement('p');
                        previewName.textContent = originalFilename + '.jpg';

                        previewItem.appendChild(previewImg);
                        previewItem.appendChild(previewName);
                        mergedImagePreviews.appendChild(previewItem);


                        // Add the image to the zip file
                        zip.file(originalFilename + ".jpg", dataUrl.substr(dataUrl.indexOf(',') + 1), {base64: true});

                        imagesProcessedCount++;

                        // Check if all images have been processed
                        if (imagesProcessedCount === backgroundFiles.length) {
                            // Generate the zip file
                            zip.generateAsync({type:"blob"})
                                .then(function(content) {
                                    // Create a download link
                                    const url = URL.createObjectURL(content);
                                    downloadZipLink.href = url;
                                    downloadZipLink.download = "merged_images.zip";
                                    downloadZipLink.style.display = 'block';
                                })
                                .catch(function(error) {
                                    console.error("Error generating ZIP:", error);
                                    alert("Failed to generate ZIP file.");
                                });
                        }
                    }
                    backgroundImage.onerror = function() {
                        console.error(`Error loading background image: ${backgroundFile.name}`);
                        imagesProcessedCount++; // Still increment to avoid blocking zip creation
                        if (imagesProcessedCount === backgroundFiles.length) {
                            // If all others processed, try to generate zip anyway
                            zip.generateAsync({type:"blob"}).then(function(content) {
                                const url = URL.createObjectURL(content);
                                downloadZipLink.href = url;
                                downloadZipLink.download = "merged_images.zip";
                                downloadZipLink.style.display = 'block';
                            });
                        }
                        alert(`Failed to load background image: ${backgroundFile.name}. Skipping.`);
                    };
                    backgroundImage.src = backgroundEvent.target.result;
                }
                backgroundReader.onerror = function() {
                    console.error(`Error reading background file: ${backgroundFile.name}`);
                    imagesProcessedCount++;
                    if (imagesProcessedCount === backgroundFiles.length) { /* Similar logic as above */ }
                    alert(`Failed to read background file: ${backgroundFile.name}. Skipping.`);
                };
                backgroundReader.readAsDataURL(backgroundFile);
            };

            // Process each background image
            for (let i = 0; i < backgroundFiles.length; i++) {
                processBackgroundImage(backgroundFiles[i]);
            }

        }
        overlayImage.onerror = function() {
            alert("Failed to load the overlay image. Please ensure it's a valid PNG.");
        };
        overlayImage.src = overlayEvent.target.result;
    }
    overlayReader.onerror = function() {
        alert("Failed to read the overlay file. Please ensure it's a valid PNG.");
    };
    overlayReader.readAsDataURL(overlayFile);
});
