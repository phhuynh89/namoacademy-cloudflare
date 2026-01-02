#!/bin/bash

# Script to create CapCut account via cronjob
# This script runs the CapCut account creation process and logs the output

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR" || exit 1

# Set up log directory
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"

# Log file with timestamp
LOG_FILE="$LOG_DIR/create-capcut-account-$(date +%Y%m%d).log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log messages
log_message() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

# Start logging
log_message "========================================="
log_message "Starting CapCut account creation process"
log_message "========================================="

# Check if Node.js and npm are available
if ! command -v node &> /dev/null; then
    log_message "ERROR: Node.js is not installed or not in PATH"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_message "ERROR: npm is not installed or not in PATH"
    exit 1
fi

# Check if .dev.vars exists
if [ ! -f "$PROJECT_DIR/.dev.vars" ]; then
    log_message "ERROR: .dev.vars file not found"
    exit 1
fi

# Run the CapCut account creation script
log_message "Running: npm run capcut-account-creator"
npm run capcut-account-creator >> "$LOG_FILE" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    log_message "CapCut account creation completed successfully"
else
    log_message "CapCut account creation failed with exit code: $EXIT_CODE"
fi

log_message "========================================="
log_message "Finished CapCut account creation process"
log_message "========================================="
echo "" >> "$LOG_FILE"

exit $EXIT_CODE

