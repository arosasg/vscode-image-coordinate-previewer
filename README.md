# Image Coordinate Previewer

A VS Code extension that allows you to preview images and see coordinate information when hovering over them.

## Features

- Open JPG and PNG images in a custom preview panel
- Display raw pixel coordinates (x, y) on hover
- Display normalized coordinates (0-1 range) on hover
- Show image dimensions
- Crosshair cursor for precise positioning
- Clean, VS Code-themed interface

## Usage

1. Right-click on a JPG or PNG file in the Explorer
2. Select "Open Image with Coordinates" from the context menu
3. Hover over the image to see coordinate information
4. The overlay shows:
   - Raw coordinates (pixel position)
   - Normalized coordinates (0.000-1.000 range)
   - Image dimensions

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run compile`
4. Press F5 to launch a new Extension Development Host window
5. Test the extension with sample images

## Development

- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and recompile
- `npm run vscode:prepublish` - Prepare for publishing

## Compatibility

- VS Code 1.74.0+
- Cursor IDE
- Supports JPG, JPEG, and PNG image formats

