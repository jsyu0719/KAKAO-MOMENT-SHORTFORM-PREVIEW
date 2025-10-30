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
const CANVAS_BACKGROUND_AREA_Y = 0;
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
                        const sourceWidthAfterCrop = backgroundImage.width - BACKGROUND_SOURCE_CROP_X;
                        const sourceHeight = backgroundImage.height;
                        const sourceX = BACKGROUND_SOURCE_CROP_X;
                        const sourceY = 0;

                        // Calculate scaling based on the *cropped* source width and target canvas width
                        const scaleFactor = CANVAS_BACKGROUND_AREA_WIDTH / sourceWidthAfterCrop;

                        const scaledSourceHeight = sourceHeight * scaleFactor;

                        let destX = CANVAS_BACKGROUND_AREA_X;
                        let destY = CANVAS_BACKGROUND_AREA_Y;
                        let destWidth = CANVAS_BACKGROUND_AREA_WIDTH;
                        let destHeight = scaledSourceHeight;

                        // Center vertically within the CANVAS_BACKGROUND_AREA_HEIGHT (1424px)
                        if (scaledSourceHeight > CANVAS_BACKGROUND_AREA_HEIGHT) {
                            // If scaled height is greater, crop top/bottom by adjusting destY
                            destY = CANVAS_BACKGROUND_AREA_Y - (scaledSourceHeight - CANVAS_BACKGROUND_AREA_HEIGHT) / 2;
                        } else {
                            // If scaled height is smaller, center vertically by adjusting destY
                            destY = CANVAS_BACKGROUND_AREA_Y + (CANVAS_BACKGROUND_AREA_HEIGHT - scaledSourceHeight) / 2;
                        }


                        // Draw the cropped and scaled background image onto the canvas
                        ctx.drawImage(
                            backgroundImage,     // Source image object
                            sourceX,             // Source X: Start cropping from 38px from left
                            sourceY,             // Source Y: Start cropping from top
                            sourceWidthAfterCrop,// Source Width: The width of the image *after* cropping
                            sourceHeight,        // Source Height: Full height of the image
                            destX,               // Destination X on canvas
                            destY,               // Destination Y on canvas
                            destWidth,           // Destination Width on canvas (720px)
                            destHeight           // Destination Height on canvas (scaled height)
                        );
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
