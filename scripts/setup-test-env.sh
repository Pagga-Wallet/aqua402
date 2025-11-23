#!/bin/bash

set -e

echo "Setting up test environment..."

# Install contract dependencies
echo "Installing contract dependencies..."
cd contracts
npm install
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Download Go dependencies
echo "Downloading Go dependencies..."
cd backend
go mod download
go mod tidy
cd ..

echo "Test environment setup complete!"

