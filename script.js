const overlayInput = document.getElementById('overlayInput');
const backgroundInput = document.getElementById('backgroundInput');
const mergeButton = document.getElementById('mergeButton');
const mergedImagePreviews = document.getElementById('mergedImagePreviews');
const downloadZipLink = document.getElementById('downloadZipLink');

// --- Configuration ---
const OVERLAY_WIDTH = 720;
const OVERLAY_HEIGHT = 1565;

// The area on the canvas where the background image will be drawn
// It starts at (0, 34) and extends to the full width of the overlay.
// Its height will be (OVERLAY_HEIGHT - 34)
const BACKGROUND_DRAW_START_X = 0; // Background image starts at x=0 on the canvas
const BACKGROUND_DRAW_START_Y = 34; // Background image starts at y=34 on the canvas
const BACKGROUND_DRAW_AREA_WIDTH = OVERLAY_WIDTH; // Background fills the full overlay width
const BACKGROUND_DRAW_AREA_HEIGHT = OVERLAY_HEIGHT - BACKGROUND_DRAW_START_Y; // Remaining height for background

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
                        // Calculate scaling to fill the target width on the canvas
                        const scaleX = BACKGROUND_DRAW_AREA_WIDTH / backgroundImage.width;

                        // Calculate the scaled height based on the original aspect ratio
                        const scaledHeight = backgroundImage.height * scaleX;

                        let drawX = BACKGROUND_DRAW_START_X;
                        let drawY = BACKGROUND_DRAW_START_Y;
                        let drawWidth = BACKGROUND_DRAW_AREA_WIDTH;
                        let drawHeight = scaledHeight;

                        // Center vertically within the designated background area (BACKGROUND_DRAW_AREA_HEIGHT)
                        if (scaledHeight > BACKGROUND_DRAW_AREA_HEIGHT) {
                            // If scaled height is greater, crop top/bottom
                            drawY = BACKGROUND_DRAW_START_Y - (scaledHeight - BACKGROUND_DRAW_AREA_HEIGHT) / 2;
                        } else {
                            // If scaled height is smaller, center vertically
                            drawY = BACKGROUND_DRAW_START_Y + (BACKGROUND_DRAW_AREA_HEIGHT - scaledHeight) / 2;
                        }

                        // Draw the background image onto the canvas
                        // Using the 5-argument drawImage to just scale and position the whole source image
                        ctx.drawImage(
                            backgroundImage,
                            drawX,          // Destination X on canvas
                            drawY,          // Destination Y on canvas
                            drawWidth,      // Destination Width on canvas
                            drawHeight      // Destination Height on canvas
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
