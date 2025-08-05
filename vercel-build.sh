#!/bin/bash
set -e

echo "🚀 Building GullyCricketX for Vercel..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the Expo web app
echo "🏗️ Building Expo web app..."
npm run build

echo "✅ Build completed successfully!"
echo "📁 Output directory: web-build/" 