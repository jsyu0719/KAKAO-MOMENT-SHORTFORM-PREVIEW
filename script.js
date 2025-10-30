const overlayInput = document.getElementById('overlayInput');
const backgroundInput = document.getElementById('backgroundInput');
const mergeButton = document.getElementById('mergeButton');
const mergedImagePreviews = document.getElementById('mergedImagePreviews'); // New element for previews
const downloadZipLink = document.getElementById('downloadZipLink');

// --- Configuration ---
const OVERLAY_WIDTH = 720;
const OVERLAY_HEIGHT = 1565;
const BACKGROUND_TARGET_WIDTH = 720; // Matches overlay width for background area
const BACKGROUND_TARGET_HEIGHT = 1565; // Matches overlay height for background area
const BACKGROUND_CROP_START_X = 34; // Start X-axis for background crop
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
            const processBackgroundImage = (backgroundFile, index) => {
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
                        // Target area for background within the overlay
                        const targetX = 0; // Background area starts from the left edge of overlay
                        const targetY = 0; // Background area starts from the top edge of overlay

                        // Calculate scaling to fill the target width
                        const scaleX = BACKGROUND_TARGET_WIDTH / backgroundImage.width;

                        // Calculate the scaled height based on the original aspect ratio
                        const scaledHeight = backgroundImage.height * scaleX;

                        let drawX = targetX;
                        let drawY = targetY; // Start drawing from the top of the background target area
                        let drawWidth = BACKGROUND_TARGET_WIDTH;
                        let drawHeight = scaledHeight;

                        // Calculate vertical centering within the target background area (if scaledHeight > targetHeight)
                        if (scaledHeight > BACKGROUND_TARGET_HEIGHT) {
                            // If scaled height is greater, center vertically and crop top/bottom
                            drawY = targetY - (scaledHeight - BACKGROUND_TARGET_HEIGHT) / 2;
                        } else {
                            // If scaled height is smaller, center vertically
                            drawY = targetY + (BACKGROUND_TARGET_HEIGHT - scaledHeight) / 2;
                        }

                        // Apply the horizontal crop starting from BACKGROUND_CROP_START_X
                        ctx.drawImage(
                            backgroundImage,
                            BACKGROUND_CROP_START_X, // Source X for crop on original image
                            0, // Source Y for crop on original image
                            backgroundImage.width - BACKGROUND_CROP_START_X, // Source Width for crop
                            backgroundImage.height, // Source Height for crop
                            drawX, // Destination X on canvas
                            drawY, // Destination Y on canvas
                            drawWidth, // Destination Width on canvas
                            drawHeight // Destination Height on canvas
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
                            // Try to generate zip even if some images failed
                            zip.generateAsync({type:"blob"})
                                .then(function(content) {
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
                processBackgroundImage(backgroundFiles[i], i);
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

