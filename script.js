const overlayInput = document.getElementById('overlayInput');
const backgroundInput = document.getElementById('backgroundInput');
const mergeButton = document.getElementById('mergeButton');
const mergedImage = document.getElementById('mergedImage'); // Not used directly anymore
const downloadLink = document.getElementById('downloadLink'); // Might still use for single image

mergeButton.addEventListener('click', function() {
    const overlayFile = overlayInput.files[0];
    const backgroundFiles = backgroundInput.files;

    if (!overlayFile || backgroundFiles.length === 0) {
        alert("Please select a transparent overlay and at least one background image.");
        return;
    }

    const overlayReader = new FileReader();
    overlayReader.onload = function(overlayEvent) {
        const overlayImage = new Image();
        overlayImage.onload = function() {

            // Validate overlay dimensions
            if (overlayImage.width !== 720 || overlayImage.height !== 1565) {
                alert("Overlay image must be 720X1565 pixels.");
                return;
            }

            // Create a JSZip instance
            const zip = new JSZip();

            let imagesProcessed = 0; // Track how many images have been processed

            for (let i = 0; i < backgroundFiles.length; i++) {
                const backgroundFile = backgroundFiles[i];
                const backgroundReader = new FileReader();
                const filename = backgroundFile.name.replace(/\.[^/.]+$/, ""); // Remove extension

                backgroundReader.onload = function(backgroundEvent) {
                    const backgroundImage = new Image();
                    backgroundImage.onload = function() {
                        const canvas = document.createElement('canvas');
                        canvas.width = 720; // Overlay width
                        canvas.height = 1565; // Overlay height
                        const ctx = canvas.getContext('2d');

                        // Target area for background (within the overlay)
                        const targetX = 34;
                        const targetY = 0;
                        const targetWidth = 720; // Corrected width
                        const targetHeight = 1280; // Corrected height

                        // Calculate scaling to fill the width
                        const scaleX = targetWidth / backgroundImage.width;

                        // Calculate the scaled height based on the original aspect ratio
                        const scaledHeight = backgroundImage.height * scaleX;

                        let drawX = targetX;
                        let drawY = targetY - (scaledHeight - targetHeight) / 2;
                        let drawWidth = targetWidth;
                        let drawHeight = scaledHeight;

                         // Draw background image (resized)
                        ctx.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight);

                        // Draw overlay image on top
                        ctx.drawImage(overlayImage, 0, 0);

                        // Convert to JPG
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // Quality 0.9
                        // Add the image to the zip file
                        zip.file(filename + ".jpg", dataUrl.substr(dataUrl.indexOf(',') + 1), {base64: true});

                        imagesProcessed++;

                        // Check if all images have been processed
                        if (imagesProcessed === backgroundFiles.length) {
                            // Generate the zip file
                            zip.generateAsync({type:"blob"})
                                .then(function(content) {
                                    // Create a download link
                                    const url = URL.createObjectURL(content);
                                    downloadLink.href = url;
                                    downloadLink.download = "merged_images.zip";
                                    downloadLink.style.display = 'block';
                                });
                        }
                    }
                    backgroundImage.src = backgroundEvent.target.result;
                }
                backgroundReader.readAsDataURL(backgroundFile);
            }
        }
        overlayImage.src = overlayEvent.target.result;
    }
    overlayReader.readAsDataURL(overlayFile);
});


