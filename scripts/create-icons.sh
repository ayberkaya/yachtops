#!/bin/bash

# Icon creation script for HelmOps PWA
# This script creates PNG icons from SVG

echo "Creating PWA icons..."

# Check if ImageMagick is installed
if command -v convert &> /dev/null; then
    echo "Using ImageMagick..."
    convert public/icon.svg -resize 192x192 public/icon-192.png
    convert public/icon.svg -resize 512x512 public/icon-512.png
    echo "✅ Icons created successfully!"
elif command -v magick &> /dev/null; then
    echo "Using ImageMagick (magick)..."
    magick public/icon.svg -resize 192x192 public/icon-192.png
    magick public/icon.svg -resize 512x512 public/icon-512.png
    echo "✅ Icons created successfully!"
elif command -v sips &> /dev/null; then
    echo "Using macOS sips..."
    # macOS sips doesn't support SVG directly, so we'll need to use a workaround
    echo "⚠️  macOS sips doesn't support SVG. Please use an online converter or install ImageMagick:"
    echo "   brew install imagemagick"
    exit 1
else
    echo "❌ No image conversion tool found."
    echo ""
    echo "Please install ImageMagick:"
    echo "  macOS: brew install imagemagick"
    echo "  Linux: sudo apt-get install imagemagick"
    echo "  Windows: Download from https://imagemagick.org"
    echo ""
    echo "Or use an online converter:"
    echo "  https://cloudconvert.com/svg-to-png"
    echo "  https://convertio.co/svg-png/"
    exit 1
fi

