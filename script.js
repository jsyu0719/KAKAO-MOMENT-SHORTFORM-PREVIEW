const overlayInput = document.getElementById('overlayInput');
const backgroundInput = document.getElementById('backgroundInput');
const mergeButton = document.getElementById('mergeButton');
const mergedImagePreviews = document.getElementById('mergedImagePreviews');
const downloadZipLink = document.getElementById('downloadZipLink');

// --- Configuration ---
const OVERLAY_WIDTH = 720;
const OVERLAY_HEIGHT = 1565;

// The area on the canvas where the background image will be drawn
const CANVAS_BACKGROUND_AREA_X = 0;
const CANVAS_BACKGROUND_AREA_Y = 0; // Background starts at y=0 on the canvas
const CANVAS_BACKGROUND_AREA_WIDTH = OVERLAY_WIDTH; // Fill entire overlay width
const CANVAS_BACKGROUND_AREA_HEIGHT = 1424; // Target height as specified

// Cropping from the *source* background image
const BACKGROUND_SOURCE_CROP_X = 38; // Crop 38 pixels from the left of the source image

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

                        // Source region of the background image to be used AFTER cropping 38px from left
                        const sourceCropStartX = BACKGROUND_SOURCE_CROP_X;
                        const sourceWidthAfterCrop = backgroundImage.width - sourceCropStartX;
                        const sourceHeightFull = backgroundImage.height;

                        // Calculate scaling based on the *cropped* source width and target canvas width
                        const scaleFactor = CANVAS_BACKGROUND_AREA_WIDTH / sourceWidthAfterCrop;

                        const scaledSourceHeight = sourceHeightFull * scaleFactor;

                        let srcX = sourceCropStartX;  // Initial source X from original image
                        let srcY = 0;                   // Initial source Y from original image
                        let srcWidth = sourceWidthAfterCrop; // Initial source width from original image
                        let srcHeight = sourceHeightFull;    // Initial source height from original image

                        let destX = CANVAS_BACKGROUND_AREA_X;   // Destination X on canvas
                        let destY = CANVAS_BACKGROUND_AREA_Y;   // Destination Y on canvas
                        let destWidth = CANVAS_BACKGROUND_AREA_WIDTH; // Destination Width on canvas
                        let destHeight = CANVAS_BACKGROUND_AREA_HEIGHT; // Destination Height on canvas (fixed 1424px)

                        // Adjust sourceY and sourceHeight for vertical centering/cropping
                        if (scaledSourceHeight > CANVAS_BACKGROUND_AREA_HEIGHT) {
                            // If the scaled image is taller than the target area, crop from top/bottom
                            const cropAmountPx = (scaledSourceHeight - CANVAS_BACKGROUND_AREA_HEIGHT) / scaleFactor / 2;
                            srcY += cropAmountPx;
                            srcHeight -= (cropAmountPx * 2);
                        } else {
                            // If the scaled image is shorter, it should be centered vertically
                            // No change to srcY/srcHeight needed, destY will be adjusted to center.
                            // However, we want destY to be 0 and then scale the image to fit 1424px.
                            // To fill the 1424px, we need to ensure the scaled image is 1424px high.
                            // Since we want to maintain aspect ratio after horizontal scale,
                            // this means if it's shorter, it *won't* fill 1424px.
                            // Given the requirement to fill the width (720) and constrain height (1424),
                            // if scaledSourceHeight is less than 1424, there will be empty space.
                            // The current interpretation is to scale to fit width, then crop top/bottom to 1424.
                            // If you meant to stretch the image vertically to fit 1424px if it's too short,
                            // we would need different logic.
                            // For now, adhering to "fill width, crop excess height".
                            // If scaledSourceHeight is < CANVAS_BACKGROUND_AREA_HEIGHT, there will be blank space
                            // at the bottom or top/bottom if centered. Let's keep destY = 0
                            // and destHeight = scaledSourceHeight to show the full image if it's shorter,
                            // but then we'd have to ensure the overlay covers the blank space.
                            //
                            // Re-evaluating: "Height will ideally start 0 pixel and ended in around 1424 pixel"
                            // This means the canvas area from Y=0 to Y=1424 *must* be filled by the background.
                            // So, we must scale its height to 1424, *after* scaling its width to 720.
                            // This implies *ignoring* the aspect ratio for the final height if it doesn't fit 1424px.
                            // If aspect ratio must be maintained, and it's shorter, then it won't fill 1424.
                            // Let's assume aspect ratio *is maintained* by the width scale, and we crop to 1424px.
                            // So if scaledSourceHeight < 1424, it will just draw the scaledSourceHeight.
                            // If the expectation is to *stretch* it to exactly 1424px if shorter, that's a different code path.

                            // Let's stick with the interpretation: scale to fit 720px width, then crop or show full height within 1424px, maintaining aspect.
                            // If scaledSourceHeight < CANVAS_BACKGROUND_AREA_HEIGHT, then we center it in the 1424px space.
                            destY = CANVAS_BACKGROUND_AREA_Y + (CANVAS_BACKGROUND_AREA_HEIGHT - scaledSourceHeight) / 2;
                            destHeight = scaledSourceHeight; // Show its full scaled height
                        }


                        // Draw the cropped and scaled background image onto the canvas
                        ctx.drawImage(
                            backgroundImage,     // Source image object
                            srcX,                // Source X: Start cropping from 38px from left (adjusted srcX for vertical crop)
                            srcY,                // Source Y: Adjusted for vertical centering
                            srcWidth,            // Source Width: The width of the image *after* cropping
                            srcHeight,           // Source Height: Adjusted for vertical centering
                            destX,               // Destination X on canvas (0)
                            destY,               // Destination Y on canvas (0, or adjusted for centering if shorter)
                            destWidth,           // Destination Width on canvas (720)
                            destHeight           // Destination Height on canvas (scaled height or 1424, if cropped)
                        );

                        // Clear any parts of the 1424px height that the image might not cover if it's shorter and not filling
                        // This prevents issues if the image is too short to fill the 1424px area and destY is not 0
                        ctx.clearRect(0, 0, CANVAS_BACKGROUND_AREA_WIDTH, destY);
                        ctx.clearRect(0, destY + destHeight, CANVAS_BACKGROUND_AREA_WIDTH, CANVAS_BACKGROUND_AREA_HEIGHT - (destY + destHeight));

                        // --- End Background Drawing Logic ---

                        // Draw overlay image on top
                        // Note: If the overlay itself has transparent areas in the 0-1424px region
                        // where the background should be visible, this is fine.
                        // If the overlay has a solid background from 0-1424px, the background image
                        // will be hidden unless you're trying to create a specific effect.
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
