# Image Merger

A simple web page that merges a transparent PNG overlay with one or more background images.

## Features

*   Merges a fixed-size transparent PNG overlay (1206x2622 pixels) with background images.
*   Allows selection of multiple background images for merging.
*   Resizes the background image to fit within a specified area (1206x2363) of the overlay.
*   Provides a download link for the merged image in JPG format.

## How to Use

1.  **Select Overlay:** Choose a transparent PNG image that is exactly 1206 pixels wide and 2622 pixels high.
2.  **Select Background Images:** Choose one or more background images (9:16 aspect ratio recommended).
3.  **Merge:** Click the "Merge Images" button.
4.  **Download:** A merged image will be displayed, and a download link will appear. Click the link to download the image as a JPG file.

## Important Notes

*   The overlay image *must* be exactly 1206x2622 pixels in dimension.
*   The background image is resized to fit within the 1206x2363 area of the overlay. The original aspect ratio of the background image is maintained, but it may be cropped to fit.
*   The merged image is downloaded in JPG format with a quality of 90%.
*   This is a client-side implementation. Performance may be limited for very large images.

## Known Issues

*   No error handling for invalid image formats.
*   Limited UI.
*   Performance may be slow for very large background images.

## License

[Choose a license, e.g., MIT License]
