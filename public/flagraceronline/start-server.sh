#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================"
echo -e "     MULTIPLAYER GAME SERVER"
echo -e "========================================${NC}"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    echo
    exit 1
fi

# Display Node.js version
echo -e "${GREEN}Node.js version:${NC}"
node --version
echo

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}ERROR: npm is not installed${NC}"
    echo "Please install npm"
    echo
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}ERROR: package.json not found${NC}"
    echo "Please make sure you're in the correct directory"
    echo
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Failed to install dependencies${NC}"
        echo
        exit 1
    fi
    echo -e "${GREEN}Dependencies installed successfully!${NC}"
    echo
fi

# Start the server
echo -e "${GREEN}Starting multiplayer server...${NC}"
echo -e "${BLUE}Server will be available at: http://localhost:3000${NC}"
echo -e "${BLUE}Test page will be available at: http://localhost:3000/test-connection.html${NC}"
echo
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo -e "${BLUE}========================================${NC}"
echo

# Trap Ctrl+C
trap 'echo -e "\n${YELLOW}Server stopped by user${NC}"; exit 0' INT

npm start

# If server stops, show message
echo
echo -e "${YELLOW}Server has stopped.${NC}" 