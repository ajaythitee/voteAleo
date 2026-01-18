#!/bin/bash

# VoteAleo Contract Deployment Script
# This script deploys the voting contract to Aleo Testnet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   VoteAleo Contract Deployment Script${NC}"
echo -e "${GREEN}================================================${NC}"

# Configuration
PRIVATE_KEY="${PRIVATE_KEY:-APrivateKey1zkp9GcV6CcgKCyiJ1mpgEvLzPeauVzySXxdRGPz3X53HVip}"
NETWORK="testnet"
ENDPOINT="https://api.explorer.provable.com/v1"
CONTRACT_DIR="voting_votealeo"

# Check if Leo is installed
if ! command -v leo &> /dev/null; then
    echo -e "${RED}Error: Leo is not installed. Please install Leo CLI first.${NC}"
    echo "Visit: https://developer.aleo.org/leo/installation"
    exit 1
fi

# Display Leo version
echo -e "\n${YELLOW}Leo Version:${NC}"
leo --version

# Navigate to contract directory
cd "$(dirname "$0")/${CONTRACT_DIR}"
echo -e "\n${YELLOW}Working directory: $(pwd)${NC}"

# Build the contract
echo -e "\n${YELLOW}Building contract...${NC}"
leo build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Build successful!${NC}"
else
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

# Deploy the contract
echo -e "\n${YELLOW}Deploying to ${NETWORK}...${NC}"
echo -e "${YELLOW}Endpoint: ${ENDPOINT}${NC}"

leo deploy \
    --private-key "${PRIVATE_KEY}" \
    --network "${NETWORK}" \
    --endpoint "${ENDPOINT}" \
    --broadcast \
    --yes

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}================================================${NC}"
    echo -e "${GREEN}   Deployment Successful!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo -e "\n${YELLOW}IMPORTANT: Update your .env.local with the program ID:${NC}"
    echo -e "NEXT_PUBLIC_VOTING_PROGRAM_ID=voting_votealeo_1234.aleo"
    echo -e "\n${YELLOW}Verify on Aleo Explorer:${NC}"
    echo -e "https://explorer.aleo.org/program/voting_votealeo_1234.aleo"
else
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
fi
