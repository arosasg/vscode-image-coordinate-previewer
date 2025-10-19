import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('Image Coordinate Previewer extension is now active!');

    // Register command
    let disposable = vscode.commands.registerCommand('imageCoordinatePreviewer.openImage', (uri?: vscode.Uri) => {
        if (uri) {
            openImagePreview(context, uri);
        } else {
            vscode.window.showOpenDialog({
                canSelectMany: false,
                openLabel: 'Open Image',
                filters: {
                    'Images': ['jpg', 'jpeg', 'png']
                }
            }).then(fileUri => {
                if (fileUri && fileUri[0]) {
                    openImagePreview(context, fileUri[0]);
                }
            });
        }
    });

    // Register custom editor provider
    const provider = new ImageCoordinateEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
        'imageCoordinatePreviewer.imagePreview',
        provider
    );

    context.subscriptions.push(disposable, providerRegistration);
}

function openImagePreview(context: vscode.ExtensionContext, uri: vscode.Uri) {
    const panel = vscode.window.createWebviewPanel(
        'imageCoordinatePreviewer',
        `Image Coordinates - ${path.basename(uri.fsPath)}`,
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src'))]
        }
    );

    // Get the image data as base64
    const imageData = vscode.workspace.fs.readFile(uri).then(data => {
        const base64 = Buffer.from(data).toString('base64');
        const extension = path.extname(uri.fsPath).toLowerCase();
        const mimeType = extension === '.png' ? 'image/png' : 'image/jpeg';
        
        panel.webview.html = getWebviewContent(`data:${mimeType};base64,${base64}`);
    });
}

function getWebviewContent(imageSrc: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Coordinate Previewer</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100vh;
            box-sizing: border-box;
        }
        
        .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            max-width: 100%;
            max-height: 100%;
        }
        
        .image-container {
            position: relative;
            display: inline-block;
            width: 100%;
            height: calc(100vh - 250px);
            border: 2px solid var(--vscode-panel-border);
            border-radius: 4px;
            overflow: hidden;
            background-color: var(--vscode-editor-background);
        }
        
        .image-container img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
            cursor: crosshair;
            max-width: 100%;
            max-height: 100%;
        }
        
        .drawing-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
        }
        
        .drawing-overlay.active {
            pointer-events: all;
        }
        
        .rectangle-overlay {
            position: absolute;
            border: 2px solid #ff6b6b;
            background-color: rgba(255, 107, 107, 0.1);
            pointer-events: none;
            display: none;
        }
        
        .rectangle-handles {
            position: absolute;
            width: 8px;
            height: 8px;
            background-color: #ff6b6b;
            border: 1px solid white;
            border-radius: 50%;
            pointer-events: all;
            cursor: pointer;
        }
        
        .handle-nw { top: -4px; left: -4px; cursor: nw-resize; }
        .handle-ne { top: -4px; right: -4px; cursor: ne-resize; }
        .handle-sw { bottom: -4px; left: -4px; cursor: sw-resize; }
        .handle-se { bottom: -4px; right: -4px; cursor: se-resize; }
        
        .coordinate-overlay {
            position: fixed;
            top: 20px;
            left: 20px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 8px 12px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            color: var(--vscode-editor-foreground);
            pointer-events: none;
            z-index: 1000;
            min-width: 200px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        .coordinate-row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
        }
        
        .coordinate-label {
            font-weight: bold;
            margin-right: 10px;
        }
        
        .coordinate-value {
            font-family: var(--vscode-editor-font-family);
            color: var(--vscode-textPreformat-foreground);
        }
        
        .instructions {
            margin-top: 20px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }
        
        .controls {
            margin-top: 15px;
            display: flex;
            gap: 10px;
            justify-content: center;
        }
        
        .control-button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .control-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .rectangle-coords {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 8px 12px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            color: var(--vscode-editor-foreground);
            pointer-events: none;
            z-index: 1000;
            min-width: 200px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            display: none;
        }
        
        .copy-section {
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            text-align: left;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            z-index: 1000;
        }
        
        .copy-button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin-bottom: 10px;
        }
        
        .copy-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .copy-button:disabled {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: not-allowed;
        }
        
        .json-output {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            color: var(--vscode-textPreformat-foreground);
            white-space: pre;
            word-break: normal;
            max-width: 100%;
            margin: 0;
            text-align: left;
            overflow-x: auto;
            display: none;
            max-height: 200px;
            overflow-y: auto;
        }
        
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="image-container">
            <img id="image" src="${imageSrc}" alt="Image" />
            <div id="drawingOverlay" class="drawing-overlay"></div>
            <div id="coordinateOverlay" class="coordinate-overlay hidden">
                <div class="coordinate-row">
                    <span class="coordinate-label">Raw:</span>
                    <span id="rawCoords" class="coordinate-value">(0, 0)</span>
                </div>
                <div class="coordinate-row">
                    <span class="coordinate-label">Normalized:</span>
                    <span id="normalizedCoords" class="coordinate-value">(0.000, 0.000)</span>
                </div>
                <div class="coordinate-row">
                    <span class="coordinate-label">Dimensions:</span>
                    <span id="dimensions" class="coordinate-value">0 × 0</span>
                </div>
            </div>
            <div id="rectangleOverlay" class="rectangle-overlay">
                <div class="rectangle-handles handle-nw"></div>
                <div class="rectangle-handles handle-ne"></div>
                <div class="rectangle-handles handle-sw"></div>
                <div class="rectangle-handles handle-se"></div>
            </div>
            <div id="rectangleCoords" class="rectangle-coords">
                <div class="coordinate-row">
                    <span class="coordinate-label">Top:</span>
                    <span id="rectTop" class="coordinate-value">0</span>
                    <span id="rectTopNorm" class="coordinate-value">(0.000)</span>
                </div>
                <div class="coordinate-row">
                    <span class="coordinate-label">Left:</span>
                    <span id="rectLeft" class="coordinate-value">0</span>
                    <span id="rectLeftNorm" class="coordinate-value">(0.000)</span>
                </div>
                <div class="coordinate-row">
                    <span class="coordinate-label">Right:</span>
                    <span id="rectRight" class="coordinate-value">0</span>
                    <span id="rectRightNorm" class="coordinate-value">(0.000)</span>
                </div>
                <div class="coordinate-row">
                    <span class="coordinate-label">Bottom:</span>
                    <span id="rectBottom" class="coordinate-value">0</span>
                    <span id="rectBottomNorm" class="coordinate-value">(0.000)</span>
                </div>
                <div class="coordinate-row">
                    <span class="coordinate-label">Width:</span>
                    <span id="rectWidth" class="coordinate-value">0</span>
                    <span id="rectWidthNorm" class="coordinate-value">(0.000)</span>
                </div>
                <div class="coordinate-row">
                    <span class="coordinate-label">Height:</span>
                    <span id="rectHeight" class="coordinate-value">0</span>
                    <span id="rectHeightNorm" class="coordinate-value">(0.000)</span>
                </div>
            </div>
        </div>
        <div class="instructions">
            Hover over the image to see coordinate information. Click and drag to draw a rectangle.
        </div>
        <div class="controls">
            <button id="clearRect" class="control-button">Clear Rectangle</button>
            <button id="toggleMode" class="control-button">Drawing Mode</button>
        </div>
        <div class="copy-section">
            <button id="copyCoords" class="copy-button" disabled>Copy Coordinates</button>
            <div id="jsonOutput" class="json-output"></div>
        </div>
    </div>

    <script>
        const image = document.getElementById('image');
        const overlay = document.getElementById('coordinateOverlay');
        const rawCoords = document.getElementById('rawCoords');
        const normalizedCoords = document.getElementById('normalizedCoords');
        const dimensions = document.getElementById('dimensions');
        const rectangleOverlay = document.getElementById('rectangleOverlay');
        const rectangleCoords = document.getElementById('rectangleCoords');
        const clearRectBtn = document.getElementById('clearRect');
        const toggleModeBtn = document.getElementById('toggleMode');
        const drawingOverlay = document.getElementById('drawingOverlay');
        const copyCoordsBtn = document.getElementById('copyCoords');
        const jsonOutput = document.getElementById('jsonOutput');
        
        // Rectangle coordinate elements
        const rectTop = document.getElementById('rectTop');
        const rectLeft = document.getElementById('rectLeft');
        const rectRight = document.getElementById('rectRight');
        const rectBottom = document.getElementById('rectBottom');
        const rectWidth = document.getElementById('rectWidth');
        const rectHeight = document.getElementById('rectHeight');
        
        // Normalized rectangle coordinate elements
        const rectTopNorm = document.getElementById('rectTopNorm');
        const rectLeftNorm = document.getElementById('rectLeftNorm');
        const rectRightNorm = document.getElementById('rectRightNorm');
        const rectBottomNorm = document.getElementById('rectBottomNorm');
        const rectWidthNorm = document.getElementById('rectWidthNorm');
        const rectHeightNorm = document.getElementById('rectHeightNorm');
        
        let imageWidth = 0;
        let imageHeight = 0;
        let isDrawingMode = false;
        let isDrawing = false;
        let startX = 0;
        let startY = 0;
        let currentRect = null;
        
        function getImageDisplayMetrics() {
            const rect = image.getBoundingClientRect();
            const elementWidth = rect.width;
            const elementHeight = rect.height;

            if (imageWidth <= 0 || imageHeight <= 0 || elementWidth <= 0 || elementHeight <= 0) {
                return {
                    rect,
                    renderedWidth: elementWidth,
                    renderedHeight: elementHeight,
                    offsetX: 0,
                    offsetY: 0,
                    scaleX: elementWidth > 0 ? 1 : 0,
                    scaleY: elementHeight > 0 ? 1 : 0
                };
            }

            const widthScale = elementWidth / imageWidth;
            const heightScale = elementHeight / imageHeight;
            const scale = Math.min(widthScale, heightScale);

            const renderedWidth = imageWidth * scale;
            const renderedHeight = imageHeight * scale;
            const offsetX = (elementWidth - renderedWidth) / 2;
            const offsetY = (elementHeight - renderedHeight) / 2;

            return {
                rect,
                renderedWidth,
                renderedHeight,
                offsetX,
                offsetY,
                scaleX: renderedWidth > 0 ? imageWidth / renderedWidth : 0,
                scaleY: renderedHeight > 0 ? imageHeight / renderedHeight : 0
            };
        }

        // Wait for image to load to get actual dimensions
        image.onload = function() {
            imageWidth = this.naturalWidth;
            imageHeight = this.naturalHeight;
            dimensions.textContent = \`\${imageWidth} × \${imageHeight}\`;
            console.log('Image loaded:', imageWidth, 'x', imageHeight);
            console.log('Image display size:', this.offsetWidth, 'x', this.offsetHeight);
        };
        
        // Toggle drawing mode
        toggleModeBtn.addEventListener('click', function() {
            isDrawingMode = !isDrawingMode;
            this.textContent = isDrawingMode ? 'Hover Mode' : 'Drawing Mode';
            this.style.backgroundColor = isDrawingMode ? '#ff6b6b' : '';
            
            if (isDrawingMode) {
                drawingOverlay.classList.add('active');
            } else {
                drawingOverlay.classList.remove('active');
                clearRectangle();
            }
        });
        
        // Clear rectangle
        clearRectBtn.addEventListener('click', function() {
            clearRectangle();
        });
        
        // Copy coordinates
        copyCoordsBtn.addEventListener('click', function() {
            if (currentRect && imageWidth > 0 && imageHeight > 0) {
                const coords = generateCoordinateDictionary();
                navigator.clipboard.writeText(coords).then(() => {
                    this.textContent = 'Copied!';
                    setTimeout(() => {
                        this.textContent = 'Copy Coordinates';
                    }, 2000);
                }).catch(() => {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = coords;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    this.textContent = 'Copied!';
                    setTimeout(() => {
                        this.textContent = 'Copy Coordinates';
                    }, 2000);
                });
            }
        });
        
        function clearRectangle() {
            rectangleOverlay.style.display = 'none';
            rectangleCoords.style.display = 'none';
            currentRect = null;
            copyCoordsBtn.disabled = true;
            jsonOutput.style.display = 'none';
        }
        
        function generateCoordinateDictionary() {
            if (!currentRect || imageWidth <= 0 || imageHeight <= 0) {
                return '';
            }
            
            const metrics = getImageDisplayMetrics();
            const scaleX = metrics.scaleX || 1;
            const scaleY = metrics.scaleY || 1;

            const clampedLeftPx = Math.max(0, Math.min(metrics.renderedWidth, currentRect.left));
            const clampedTopPx = Math.max(0, Math.min(metrics.renderedHeight, currentRect.top));
            const clampedRightPx = Math.max(0, Math.min(metrics.renderedWidth, currentRect.right));
            const clampedBottomPx = Math.max(0, Math.min(metrics.renderedHeight, currentRect.bottom));

            const imageLeft = Math.max(0, Math.min(imageWidth - 1, Math.round(clampedLeftPx * scaleX)));
            const imageTop = Math.max(0, Math.min(imageHeight - 1, Math.round(clampedTopPx * scaleY)));
            const imageRight = Math.max(0, Math.min(imageWidth - 1, Math.round(clampedRightPx * scaleX)));
            const imageBottom = Math.max(0, Math.min(imageHeight - 1, Math.round(clampedBottomPx * scaleY)));

            const clampedLeft = Math.min(imageLeft, imageRight);
            const clampedTop = Math.min(imageTop, imageBottom);
            const clampedRight = Math.max(imageLeft, imageRight);
            const clampedBottom = Math.max(imageTop, imageBottom);

            const topNorm = clampedTop / imageHeight;
            const leftNorm = clampedLeft / imageWidth;
            const rightNorm = clampedRight / imageWidth;
            const bottomNorm = clampedBottom / imageHeight;

            const coordsDict = {
                "top": topNorm,
                "left": leftNorm,
                "right": rightNorm,
                "bottom": bottomNorm
            };

            return JSON.stringify(coordsDict, null, 4);
        }
        
        function updateRectangleCoords(rect) {
            const metrics = getImageDisplayMetrics();
            const scaleX = metrics.scaleX || 1;
            const scaleY = metrics.scaleY || 1;

            const clampedLeftPx = Math.max(0, Math.min(metrics.renderedWidth, rect.left));
            const clampedTopPx = Math.max(0, Math.min(metrics.renderedHeight, rect.top));
            const clampedRightPx = Math.max(0, Math.min(metrics.renderedWidth, rect.right));
            const clampedBottomPx = Math.max(0, Math.min(metrics.renderedHeight, rect.bottom));

            const imageLeft = Math.max(0, Math.min(imageWidth - 1, Math.round(clampedLeftPx * scaleX)));
            const imageTop = Math.max(0, Math.min(imageHeight - 1, Math.round(clampedTopPx * scaleY)));
            const imageRight = Math.max(0, Math.min(imageWidth - 1, Math.round(clampedRightPx * scaleX)));
            const imageBottom = Math.max(0, Math.min(imageHeight - 1, Math.round(clampedBottomPx * scaleY)));
            
            // Ensure right >= left and bottom >= top
            const clampedLeft = Math.min(imageLeft, imageRight);
            const clampedTop = Math.min(imageTop, imageBottom);
            const clampedRight = Math.max(imageLeft, imageRight);
            const clampedBottom = Math.max(imageTop, imageBottom);
            
            // Calculate width and height
            const clampedWidth = clampedRight - clampedLeft;
            const clampedHeight = clampedBottom - clampedTop;
            
            // Update raw coordinates (image coordinates)
            rectTop.textContent = clampedTop;
            rectLeft.textContent = clampedLeft;
            rectRight.textContent = clampedRight;
            rectBottom.textContent = clampedBottom;
            rectWidth.textContent = clampedWidth;
            rectHeight.textContent = clampedHeight;
            
            // Calculate and update normalized coordinates
            if (imageWidth > 0 && imageHeight > 0) {
                const topNorm = (clampedTop / imageHeight).toFixed(3);
                const leftNorm = (clampedLeft / imageWidth).toFixed(3);
                const rightNorm = (clampedRight / imageWidth).toFixed(3);
                const bottomNorm = (clampedBottom / imageHeight).toFixed(3);
                const widthNorm = (clampedWidth / imageWidth).toFixed(3);
                const heightNorm = (clampedHeight / imageHeight).toFixed(3);
                
                rectTopNorm.textContent = \`(\${topNorm})\`;
                rectLeftNorm.textContent = \`(\${leftNorm})\`;
                rectRightNorm.textContent = \`(\${rightNorm})\`;
                rectBottomNorm.textContent = \`(\${bottomNorm})\`;
                rectWidthNorm.textContent = \`(\${widthNorm})\`;
                rectHeightNorm.textContent = \`(\${heightNorm})\`;
            }
            
            rectangleCoords.style.display = 'block';
            
            // Enable copy button and show JSON output
            copyCoordsBtn.disabled = false;
            const jsonString = generateCoordinateDictionary();
            jsonOutput.textContent = jsonString;
            jsonOutput.style.display = 'block';
        }
        
        function drawRectangle(x1, y1, x2, y2, metrics) {
            if (!metrics) {
                return;
            }

            const widthLimit = metrics.renderedWidth;
            const heightLimit = metrics.renderedHeight;

            const clampedX1 = Math.max(0, Math.min(widthLimit, x1));
            const clampedY1 = Math.max(0, Math.min(heightLimit, y1));
            const clampedX2 = Math.max(0, Math.min(widthLimit, x2));
            const clampedY2 = Math.max(0, Math.min(heightLimit, y2));

            const left = Math.min(clampedX1, clampedX2);
            const top = Math.min(clampedY1, clampedY2);
            const right = Math.max(clampedX1, clampedX2);
            const bottom = Math.max(clampedY1, clampedY2);

            rectangleOverlay.style.left = (left + metrics.offsetX) + 'px';
            rectangleOverlay.style.top = (top + metrics.offsetY) + 'px';
            rectangleOverlay.style.width = (right - left) + 'px';
            rectangleOverlay.style.height = (bottom - top) + 'px';
            rectangleOverlay.style.display = 'block';

            currentRect = { left, top, right, bottom, width: right - left, height: bottom - top };
            updateRectangleCoords(currentRect);
        }
        
        drawingOverlay.addEventListener('mousedown', function(e) {
            if (!isDrawingMode) return;
            
            const metrics = getImageDisplayMetrics();
            const relativeX = e.clientX - (metrics.rect.left + metrics.offsetX);
            const relativeY = e.clientY - (metrics.rect.top + metrics.offsetY);

            if (relativeX < 0 || relativeX > metrics.renderedWidth ||
                relativeY < 0 || relativeY > metrics.renderedHeight) {
                isDrawing = false;
                return;
            }

            startX = relativeX;
            startY = relativeY;
            isDrawing = true;

            clearRectangle();
            
            e.preventDefault();
        });
        
        drawingOverlay.addEventListener('mousemove', function(e) {
            const metrics = getImageDisplayMetrics();
            const relativeX = e.clientX - (metrics.rect.left + metrics.offsetX);
            const relativeY = e.clientY - (metrics.rect.top + metrics.offsetY);

            const clampedX = Math.max(0, Math.min(metrics.renderedWidth, relativeX));
            const clampedY = Math.max(0, Math.min(metrics.renderedHeight, relativeY));
            const withinBounds = relativeX >= 0 && relativeX <= metrics.renderedWidth &&
                relativeY >= 0 && relativeY <= metrics.renderedHeight;

            if (withinBounds && imageWidth > 0 && imageHeight > 0) {
                const imageX = Math.max(0, Math.min(imageWidth - 1, Math.round(clampedX * (metrics.scaleX || 1))));
                const imageY = Math.max(0, Math.min(imageHeight - 1, Math.round(clampedY * (metrics.scaleY || 1))));

                const normalizedX = imageWidth > 0 ? (imageX / imageWidth).toFixed(3) : '0.000';
                const normalizedY = imageHeight > 0 ? (imageY / imageHeight).toFixed(3) : '0.000';

                rawCoords.textContent = '(' + imageX + ', ' + imageY + ')';
                normalizedCoords.textContent = '(' + normalizedX + ', ' + normalizedY + ')';
                overlay.classList.remove('hidden');
            } else {
                rawCoords.textContent = '(outside)';
                normalizedCoords.textContent = '(outside)';
            }

            if (isDrawing && isDrawingMode) {
                drawRectangle(startX, startY, clampedX, clampedY, metrics);
            }

            e.preventDefault();
        });
        
        drawingOverlay.addEventListener('mouseup', function(e) {
            if (isDrawing && isDrawingMode) {
                isDrawing = false;
            }
            e.preventDefault();
        });
        
        drawingOverlay.addEventListener('mouseleave', function(e) {
            if (isDrawing && isDrawingMode) {
                isDrawing = false;
            }
        });
        
        // Keep hover functionality on the image for non-drawing mode
        image.addEventListener('mousemove', function(e) {
            if (isDrawingMode) return;

            const metrics = getImageDisplayMetrics();
            const relativeX = e.clientX - (metrics.rect.left + metrics.offsetX);
            const relativeY = e.clientY - (metrics.rect.top + metrics.offsetY);

            const withinBounds = relativeX >= 0 && relativeX <= metrics.renderedWidth &&
                relativeY >= 0 && relativeY <= metrics.renderedHeight;

            if (withinBounds && imageWidth > 0 && imageHeight > 0) {
                const imageX = Math.max(0, Math.min(imageWidth - 1, Math.round(relativeX * (metrics.scaleX || 1))));
                const imageY = Math.max(0, Math.min(imageHeight - 1, Math.round(relativeY * (metrics.scaleY || 1))));

                const normalizedX = imageWidth > 0 ? (imageX / imageWidth).toFixed(3) : '0.000';
                const normalizedY = imageHeight > 0 ? (imageY / imageHeight).toFixed(3) : '0.000';

                rawCoords.textContent = '(' + imageX + ', ' + imageY + ')';
                normalizedCoords.textContent = '(' + normalizedX + ', ' + normalizedY + ')';

                overlay.classList.remove('hidden');
            } else {
                overlay.classList.add('hidden');
            }
        });
        
        image.addEventListener('mouseleave', function() {
            if (!isDrawingMode) {
                overlay.classList.add('hidden');
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', function() {
            // Trigger a mousemove event to update coordinates if mouse is over image
            const rect = image.getBoundingClientRect();
            const mouseX = window.event ? window.event.clientX : 0;
            const mouseY = window.event ? window.event.clientY : 0;
            
            if (mouseX >= rect.left && mouseX <= rect.right && 
                mouseY >= rect.top && mouseY <= rect.bottom) {
                image.dispatchEvent(new MouseEvent('mousemove', {
                    clientX: mouseX,
                    clientY: mouseY
                }));
            }
        });
    </script>
</body>
</html>`;
}

function getErrorContent(message: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }
        .error-container {
            text-align: center;
            padding: 20px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h2>Error</h2>
        <p>${message}</p>
    </div>
</body>
</html>`;
}

class ImageCoordinateEditorProvider implements vscode.CustomReadonlyEditorProvider {
    constructor(private readonly context: vscode.ExtensionContext) {}

    public async openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): Promise<vscode.CustomDocument> {
        return {
            uri: uri,
            dispose: () => {}
        };
    }

    public async resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'src'))]
        };

        try {
            // Get the image data as base64
            const data = await vscode.workspace.fs.readFile(document.uri);
            const base64 = Buffer.from(data).toString('base64');
            const extension = path.extname(document.uri.fsPath).toLowerCase();
            const mimeType = extension === '.png' ? 'image/png' : 'image/jpeg';
            
            webviewPanel.webview.html = getWebviewContent(`data:${mimeType};base64,${base64}`);
        } catch (error) {
            console.error('Error loading image:', error);
            webviewPanel.webview.html = getErrorContent('Failed to load image');
        }
    }
}

export function deactivate() {}