const overlayInput = document.getElementById('overlayInput');
const backgroundInput = document.getElementById('backgroundInput');
const mergeButton = document.getElementById('mergeButton');
const mergedImage = document.getElementById('mergedImage');
const downloadLink = document.getElementById('downloadLink');

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
            if (overlayImage.width !== 1206 || overlayImage.height !== 2622) {
                alert("Overlay image must be 1206x2622 pixels.");
                return;
            }

            for (let i = 0; i < backgroundFiles.length; i++) {
                const backgroundFile = backgroundFiles[i];
                const backgroundReader = new FileReader();

                backgroundReader.onload = function(backgroundEvent) {
                    const backgroundImage = new Image();
                    backgroundImage.onload = function() {
                        const canvas = document.createElement('canvas');
                        canvas.width = 1206; // Overlay width
                        canvas.height = 2622; // Overlay height
                        const ctx = canvas.getContext('2d');

                        // Draw background image (resized)
                        ctx.drawImage(backgroundImage, 0, 0, 2363, 1206);

                        // Draw overlay image on top
                        ctx.drawImage(overlayImage, 0, 0);

                        // Convert to JPG and offer download
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // Quality 0.9

                        mergedImage.src = dataUrl;
                        downloadLink.href = dataUrl;
                        downloadLink.style.display = 'block';
                        downloadLink.download = 'merged_image.jpg';
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
