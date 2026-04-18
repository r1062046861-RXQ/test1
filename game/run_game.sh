#!/bin/bash

# Ensure we are in the script's directory
cd "$(dirname "$0")"

echo "Starting TCM Card Game (MacOS/Linux)..."

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "Build not found. Running build..."
    npm install
    npm run build
fi

# Use serve to run the game
# We use npx to run serve without global installation
echo "Launching game server..."
npx serve -s dist -l 3000

# Note: On Mac/Linux, we can try to open the browser automatically
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:3000"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "http://localhost:3000"
fi
