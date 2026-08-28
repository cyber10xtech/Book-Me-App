#!/bin/sh

# Stop script immediately on any error
set -e

# 1. Path setup (Essential for Homebrew on Apple Silicon)
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

echo "--- Initializing Environment ---"
echo "Running from: $(pwd)"

# --- FIX: Ensure Metal Toolchain is installed ---
echo "Checking for Metal Toolchain..."
if ! xcodebuild -showComponent metalToolchain >/dev/null 2>&1; then
    echo "Metal toolchain not found. Downloading..."
    xcodebuild -downloadComponent metalToolchain
    echo "Metal toolchain installed successfully."
else
    echo "Metal toolchain is already installed."
fi

# 2. Ensure Node.js is installed
if ! command -v node >/dev/null 2>&1; then
    echo "Installing Node.js via Homebrew..."
    brew install node
fi

# 3. Navigate to the actual project root
# We use 'cd' to ensure we are in the directory containing package.json
cd ../../..
echo "Switched to project root: $(pwd)"

# 4. Install Dependencies
echo "--- Installing Dependencies ---"
# npm ci is faster and safer for CI/CD than npm install
npm ci --prefer-offline --no-audit

# 5. Build Web Assets (CRITICAL)
echo "--- Building Web Assets ---"
# This produces the ./dist folder that Capacitor requires
npm run build 

# 6. Capacitor Sync
# If ios/ folder is missing, add platform; otherwise just sync
echo "--- Syncing Capacitor ---"
if [ ! -d "ios" ]; then
    echo "iOS platform missing. Adding it..."
    npx cap add ios
else
    npx cap sync ios
fi

# 7. CocoaPods Installation
echo "--- Installing CocoaPods ---"
cd ios/App
if ! command -v pod >/dev/null 2>&1; then
    brew install cocoapods
fi
pod install

echo "--- Build Preparation Successful ---"