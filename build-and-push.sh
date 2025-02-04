#!/bin/bash

# Build and push the frontend image
echo "Building frontend image..."
docker build --platform linux/amd64 -t ghcr.io/kooemmanuel/deepdeeklens:latest -f deepseek/Dockerfile deepseek/
echo "Pushing frontend image..."
docker push ghcr.io/kooemmanuel/deepdeeklens:latest

# Build and push the backend image
echo "Building backend image..."
docker build --platform linux/amd64 -t ghcr.io/kooemmanuel/deepdeeklens-backend:latest -f backend/Dockerfile backend/
echo "Pushing backend image..."
docker push ghcr.io/kooemmanuel/deepdeeklens-backend:latest

echo "Build and push completed!" 