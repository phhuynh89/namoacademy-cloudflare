#!/bin/bash

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

# Function to restart network to get new IP
restart_network() {
    log_message "Attempting to restart network to get new IP address..."
    
    # Detect active network interface (WiFi or Ethernet)
    ACTIVE_INTERFACE=$(route get default 2>/dev/null | grep interface | awk '{print $2}')
    
    if [ -z "$ACTIVE_INTERFACE" ]; then
        # Try to find WiFi interface
        WIFI_INTERFACE=$(networksetup -listallhardwareports 2>/dev/null | grep -A 1 "Wi-Fi" | grep "Device" | awk '{print $2}')
        if [ -n "$WIFI_INTERFACE" ]; then
            ACTIVE_INTERFACE="$WIFI_INTERFACE"
        fi
    fi
    
    if [ -n "$ACTIVE_INTERFACE" ]; then
        log_message "Found active interface: $ACTIVE_INTERFACE"
        
        # Try to restart WiFi first (most common on macOS)
        if [[ "$ACTIVE_INTERFACE" == en* ]]; then
            # Check if it's WiFi
            WIFI_SERVICE=$(networksetup -listallhardwareports 2>/dev/null | grep -B 1 "$ACTIVE_INTERFACE" | head -1 | sed 's/Hardware Port: //')
            
            if [[ "$WIFI_SERVICE" == *"Wi-Fi"* ]] || [[ "$WIFI_SERVICE" == *"AirPort"* ]]; then
                log_message "Restarting WiFi interface: $ACTIVE_INTERFACE"
                sudo ipconfig set en1 DHCP
            else
                # Ethernet interface
                log_message "Restarting Ethernet interface: $ACTIVE_INTERFACE"
                sudo ipconfig set en0 DHCP
            fi
        else
            # Generic interface restart
            log_message "Restarting network interface: $ACTIVE_INTERFACE"
            sudo ipconfig set en0 DHCP
        fi
        
        log_message "Waiting 10 seconds for network to reconnect..."
        sleep 10
        
        # Verify network is back up
        if ping -c 1 -W 2000 8.8.8.8 >/dev/null 2>&1; then
            NEW_IP=$(ifconfig "$ACTIVE_INTERFACE" 2>/dev/null | grep "inet " | awk '{print $2}')
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
    npm run capcut-account-creator >> "$LOG_FILE" 2>&1
    EXIT_CODE=$?

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
        
        # Check if the error is OTP timeout - check last 100 lines of log for recent error
        LAST_LOG_LINES=$(tail -n 100 "$LOG_FILE" 2>/dev/null)
        OTP_ERROR_DETECTED=false
        if echo "$LAST_LOG_LINES" | grep -qi "OTP not received within timeout period"; then
            OTP_ERROR_DETECTED=true
        elif echo "$LAST_LOG_LINES" | grep -qi "✗.*OTP.*timeout"; then
            OTP_ERROR_DETECTED=true
        elif echo "$LAST_LOG_LINES" | grep -qi "✗ Account creation failed" && echo "$LAST_LOG_LINES" | grep -qi "OTP"; then
            OTP_ERROR_DETECTED=true
        fi
        
        if [ "$OTP_ERROR_DETECTED" = true ]; then
            log_message "OTP timeout error detected. Skipping network restart."
            log_message "========================================="
            log_message "Will retry in next iteration. Waiting 10 seconds before retrying..."
            log_message "========================================="
            echo "" >> "$LOG_FILE"
            
            # Wait 10 seconds before next iteration
            sleep 10
            
            ITERATION=$((ITERATION + 1))
        else
            log_message "========================================="
            log_message "Attempting to restart network and retry..."
            log_message "========================================="
            
            # Restart network to get new IP
            restart_network
            NETWORK_RESTART_CODE=$?
            
            if [ $NETWORK_RESTART_CODE -eq 0 ]; then
                log_message "Network restarted. Retrying account creation..."
                log_message "========================================="
                log_message "Retry - Starting CapCut account creation"
                log_message "========================================="
                
                # Retry the account creation
                npm run capcut-account-creator >> "$LOG_FILE" 2>&1
                RETRY_EXIT_CODE=$?
                
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
                    log_message "Will retry in next iteration. Waiting 10 seconds before retrying..."
                    log_message "========================================="
                    echo "" >> "$LOG_FILE"
                    
                    # Wait 10 seconds before next iteration (longer wait after failure)
                    sleep 10
                    
                    ITERATION=$((ITERATION + 1))
                fi
            else
                log_message "Network restart failed or skipped. Will retry in next iteration. Waiting 10 seconds before retrying..."
                log_message "========================================="
                echo "" >> "$LOG_FILE"
                
                # Wait 10 seconds before next iteration (longer wait after failure)
                sleep 10
                
                ITERATION=$((ITERATION + 1))
            fi
        fi
    fi
done

