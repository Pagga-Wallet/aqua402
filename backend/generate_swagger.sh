#!/bin/sh

# Script for generating Swagger documentation.
#
# Usage:
#   ./generate_swagger.sh
#
# Generates Swagger documentation from cmd/api/main.go

echo "Generating Swagger documentation..."

# Install swag
go install github.com/swaggo/swag/cmd/swag@latest

# Add GOPATH/bin to PATH
export PATH=$PATH:$(go env GOPATH)/bin

# Generate Swagger documentation
swag init -g cmd/api/main.go -o docs --parseDependency --parseInternal

if [ $? -eq 0 ]; then
    echo "Swagger documentation successfully generated in docs/ directory"
else
    echo "Error generating Swagger documentation"
    exit 1
fi

