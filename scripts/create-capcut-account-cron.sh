#!/bin/bash

set -e  # Exit on error (will be disabled in error handling sections)

export HOME="/home/ec2-user"
export PUPPETEER_CACHE_DIR="$HOME/.cache/puppeteer"
cd /home/ec2-user/namoacademy-cloudflare

# Script to create CapCut account via cronjob
# This script runs the CapCut account creation process continuously in a loop

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

# Function to log messages
log_message() {
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

# Function to restart Amazon Linux server
restart_server() {
    log_message "========================================="
    log_message "CRITICAL: Account creation failed. Restarting Amazon Linux server..."
    log_message "========================================="
    echo "" >> "$LOG_FILE"
    
    # Flush logs before restart
    sync
    
    # Shutdown the server (Amazon Linux)
    sudo shutdown -h now
}

# Function to restart network to get new IP (Amazon Linux)
restart_network() {
    log_message "Attempting to restart network to get new IP address..."
    
    # Detect active network interface (Amazon Linux)
    ACTIVE_INTERFACE=$(ip route | grep default | awk '{print $5}' | head -1)
    
    if [ -z "$ACTIVE_INTERFACE" ]; then
        # Try alternative method to find default interface
        ACTIVE_INTERFACE=$(route -n | grep '^0.0.0.0' | awk '{print $8}' | head -1)
    fi
    
    if [ -z "$ACTIVE_INTERFACE" ]; then
        # Fallback: try to find any active interface
        ACTIVE_INTERFACE=$(ip link show | grep -E '^[0-9]+:' | grep -v lo | head -1 | awk '{print $2}' | sed 's/://')
    fi
    
    if [ -n "$ACTIVE_INTERFACE" ]; then
        log_message "Found active interface: $ACTIVE_INTERFACE"
        
        # Restart network interface on Amazon Linux
        log_message "Restarting network interface: $ACTIVE_INTERFACE"
        sudo ifdown "$ACTIVE_INTERFACE" 2>/dev/null || true
        sleep 2
        sudo ifup "$ACTIVE_INTERFACE" 2>/dev/null || true
        
        # Alternative: use systemctl to restart network (if using NetworkManager)
        if command -v systemctl &> /dev/null; then
            sudo systemctl restart network 2>/dev/null || sudo systemctl restart NetworkManager 2>/dev/null || true
        fi
        
        log_message "Waiting 10 seconds for network to reconnect..."
        sleep 10
        
        # Verify network is back up
        if ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1; then
            NEW_IP=$(ip addr show "$ACTIVE_INTERFACE" 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d'/' -f1)
            if [ -z "$NEW_IP" ]; then
                NEW_IP=$(ifconfig "$ACTIVE_INTERFACE" 2>/dev/null | grep "inet " | awk '{print $2}')
            fi
            log_message "Network restarted successfully. New IP: $NEW_IP"
            return 0
        else
            log_message "WARNING: Network restart completed but connectivity check failed"
            return 1
        fi
    else
        log_message "WARNING: Could not detect active network interface. Skipping network restart."
        return 1
    fi
}

# Handle graceful shutdown
cleanup() {
    log_message "========================================="
    log_message "Received shutdown signal. Stopping loop..."
    log_message "========================================="
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start logging
log_message "========================================="
log_message "Starting CapCut account creation process (continuous loop)"
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

# Continuous loop
ITERATION=1
while true; do
    log_message "========================================="
    log_message "Iteration #$ITERATION - Starting CapCut account creation"
    log_message "========================================="
    
    # Run the CapCut account creation script
    log_message "Running: npm run capcut-account-creator"
    set +e  # Disable exit on error for this section
    npm run capcut-account-creator >> "$LOG_FILE" 2>&1
    EXIT_CODE=$?
    set -e  # Re-enable exit on error

    if [ $EXIT_CODE -eq 0 ]; then
        log_message "CapCut account creation completed successfully"
        log_message "========================================="
        log_message "Iteration #$ITERATION - Finished CapCut account creation process"
        log_message "Waiting 5 seconds before next iteration..."
        log_message "========================================="
        echo "" >> "$LOG_FILE"
        
        # Wait 5 seconds before next iteration
        sleep 5
        
        ITERATION=$((ITERATION + 1))
    else
        log_message "CapCut account creation failed with exit code: $EXIT_CODE"
        log_message "========================================="
        log_message "Attempting to restart network and retry..."
        log_message "========================================="
        
        # Restart network to get new IP
        set +e  # Disable exit on error for network restart
        restart_network
        NETWORK_RESTART_CODE=$?
        set -e  # Re-enable exit on error
        
        if [ $NETWORK_RESTART_CODE -eq 0 ]; then
            log_message "Network restarted. Retrying account creation..."
            log_message "========================================="
            log_message "Retry - Starting CapCut account creation"
            log_message "========================================="
            
            # Retry the account creation
            set +e  # Disable exit on error for retry
            npm run capcut-account-creator >> "$LOG_FILE" 2>&1
            RETRY_EXIT_CODE=$?
            set -e  # Re-enable exit on error
            
            if [ $RETRY_EXIT_CODE -eq 0 ]; then
                log_message "CapCut account creation completed successfully after retry"
                log_message "========================================="
                log_message "Iteration #$ITERATION - Finished CapCut account creation process (after retry)"
                log_message "Waiting 5 seconds before next iteration..."
                log_message "========================================="
                echo "" >> "$LOG_FILE"
                
                # Wait 5 seconds before next iteration
                sleep 5
                
                ITERATION=$((ITERATION + 1))
            else
                log_message "CapCut account creation failed again after retry with exit code: $RETRY_EXIT_CODE"
                log_message "========================================="
                log_message "Account creation failed after network restart. Restarting server..."
                log_message "========================================="
                echo "" >> "$LOG_FILE"
                
                # Restart the server
                restart_server
                # This will reboot the server, so the script won't continue
            fi
        else
            log_message "Network restart failed or skipped."
            log_message "========================================="
            log_message "Account creation failed and network restart failed. Restarting server..."
            log_message "========================================="
            echo "" >> "$LOG_FILE"
            
            # Restart the server
            restart_server
            # This will reboot the server, so the script won't continue
        fi
    fi
done

