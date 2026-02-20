#!/bin/bash

# Privote Contract Deployment Script
# This script deploys both the voting and auction contracts to Aleo Testnet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   Privote Contract Deployment Script${NC}"
echo -e "${GREEN}   Deploying Voting + Auction Contracts${NC}"
echo -e "${GREEN}================================================${NC}"

# Configuration
PRIVATE_KEY="${PRIVATE_KEY:-APrivateKey1zkp9GcV6CcgKCyiJ1mpgEvLzPeauVzySXxdRGPz3X53HVip}"
NETWORK="testnet"
ENDPOINT="https://api.explorer.provable.com/v1"
SCRIPT_DIR="$(dirname "$0")"

# Check if Leo is installed
if ! command -v leo &> /dev/null; then
    echo -e "${RED}Error: Leo is not installed. Please install Leo CLI first.${NC}"
    echo "Visit: https://developer.aleo.org/leo/installation"
    exit 1
fi

# Display Leo version
echo -e "\n${YELLOW}Leo Version:${NC}"
leo --version

# Function to deploy a contract
deploy_contract() {
    local CONTRACT_DIR=$1
    local CONTRACT_NAME=$2
    local PROGRAM_ID=$3
    
    echo -e "\n${GREEN}================================================${NC}"
    echo -e "${GREEN}   Deploying ${CONTRACT_NAME}${NC}"
    echo -e "${GREEN}================================================${NC}"
    
    # Navigate to contract directory
    cd "${SCRIPT_DIR}/${CONTRACT_DIR}"
    echo -e "\n${YELLOW}Working directory: $(pwd)${NC}"
    
    # Build the contract
    echo -e "\n${YELLOW}Building ${CONTRACT_NAME}...${NC}"
    leo build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Build successful!${NC}"
    else
        echo -e "${RED}Build failed!${NC}"
        exit 1
    fi
    
    # Deploy the contract
    echo -e "\n${YELLOW}Deploying ${CONTRACT_NAME} to ${NETWORK}...${NC}"
    echo -e "${YELLOW}Endpoint: ${ENDPOINT}${NC}"
    
    leo deploy \
        --private-key "${PRIVATE_KEY}" \
        --network "${NETWORK}" \
        --endpoint "${ENDPOINT}" \
        --broadcast \
        --yes
    
    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}${CONTRACT_NAME} deployment successful!${NC}"
        echo -e "${YELLOW}Program ID: ${PROGRAM_ID}${NC}"
        if [ "${NETWORK}" = "testnet" ]; then
            echo -e "${YELLOW}Verify on Aleo Testnet Explorer:${NC}"
            echo -e "https://testnet.aleoscan.io/program/${PROGRAM_ID}"
        else
            echo -e "${YELLOW}Verify on Aleo Explorer:${NC}"
            echo -e "https://explorer.aleo.org/program/${PROGRAM_ID}"
        fi
    else
        echo -e "${RED}${CONTRACT_NAME} deployment failed!${NC}"
        exit 1
    fi
}

# Deploy Voting Contract
deploy_contract "vote" "Voting Contract" "${VOTING_PROGRAM_ID:-vote_privacy_8000.aleo}"

# Deploy Auction Contract
deploy_contract "auction" "Auction Contract" "${AUCTION_PROGRAM_ID:-privote_auction_5000.aleo}"

# Final summary
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}   All Contracts Deployed Successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "\n${YELLOW}Deployed Contracts:${NC}"
echo -e "  - Voting: ${VOTING_PROGRAM_ID:-vote_privacy_8000.aleo}"
echo -e "  - Auction: ${AUCTION_PROGRAM_ID:-privote_auction_5000.aleo}"
echo -e "\n${YELLOW}IMPORTANT: Update frontend/.env.local with the program IDs:${NC}"
echo -e "NEXT_PUBLIC_VOTING_PROGRAM_ID=\${VOTING_PROGRAM_ID:-vote_privacy_8000.aleo}"
echo -e "NEXT_PUBLIC_AUCTION_PROGRAM_ID=\${AUCTION_PROGRAM_ID:-privote_auction_5000.aleo}"
