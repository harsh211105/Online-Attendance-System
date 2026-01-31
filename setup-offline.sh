#!/bin/bash
# Download face-api.js and models for offline use
# Run this ONCE from the project root directory

echo "📦 Setting up offline face recognition..."

# Create models directory
mkdir -p models

echo "📥 Downloading face-api library..."
# Download the library
curl -o face-api.min.js https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js

echo "📥 Downloading face detection models..."
cd models

# Download all required models
curl -O https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/ssd_mobilenetv1_model-weights_manifest.json
curl -O https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/ssd_mobilenetv1_model.weights.bin
curl -O https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_landmark_68_model-weights_manifest.json
curl -O https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_landmark_68_model.weights.bin
curl -O https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_recognition_model-weights_manifest.json
curl -O https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_recognition_model.weights.bin

cd ..

echo "✅ Setup complete! Face recognition is now offline-ready."
echo "🚀 Start the server with: npm start"
echo "📝 App will work without internet now!"
