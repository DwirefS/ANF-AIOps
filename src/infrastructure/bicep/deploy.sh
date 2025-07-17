#!/bin/bash
# Azure NetApp Files AI-Ops Infrastructure Deployment Script
# Author: Dwiref Sharma <DwirefS@SapientEdge.com>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 -e <environment> -l <location> [-s <subscription>]"
    echo "  -e: Environment (dev, test, prod)"
    echo "  -l: Azure location (e.g., eastus, westus2)"
    echo "  -s: Azure subscription ID (optional)"
    echo "  -h: Display this help message"
    exit 1
}

# Parse command line arguments
while getopts "e:l:s:h" opt; do
    case $opt in
        e) ENVIRONMENT="$OPTARG";;
        l) LOCATION="$OPTARG";;
        s) SUBSCRIPTION="$OPTARG";;
        h) usage;;
        \?) echo "Invalid option -$OPTARG" >&2; usage;;
    esac
done

# Validate required parameters
if [ -z "$ENVIRONMENT" ] || [ -z "$LOCATION" ]; then
    echo -e "${RED}Error: Environment and location are required${NC}"
    usage
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|test|prod)$ ]]; then
    echo -e "${RED}Error: Environment must be dev, test, or prod${NC}"
    exit 1
fi

echo -e "${GREEN}Deploying ANF AI-Ops Infrastructure${NC}"
echo "Environment: $ENVIRONMENT"
echo "Location: $LOCATION"

# Set subscription if provided
if [ ! -z "$SUBSCRIPTION" ]; then
    echo "Setting subscription to $SUBSCRIPTION"
    az account set --subscription "$SUBSCRIPTION"
fi

# Get current subscription
CURRENT_SUB=$(az account show --query id -o tsv)
echo "Using subscription: $CURRENT_SUB"

# Parameter file
PARAM_FILE="environments/${ENVIRONMENT}.parameters.json"

# Check if parameter file exists
if [ ! -f "$PARAM_FILE" ]; then
    echo -e "${RED}Error: Parameter file $PARAM_FILE not found${NC}"
    exit 1
fi

# Deployment name
DEPLOYMENT_NAME="anf-aiops-${ENVIRONMENT}-$(date +%Y%m%d%H%M%S)"

# Create deployment
echo -e "${YELLOW}Starting deployment: $DEPLOYMENT_NAME${NC}"

az deployment sub create \
    --name "$DEPLOYMENT_NAME" \
    --location "$LOCATION" \
    --template-file main.bicep \
    --parameters "@$PARAM_FILE" \
    --parameters location="$LOCATION" \
    --output table

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    
    # Display outputs
    echo -e "${YELLOW}Deployment Outputs:${NC}"
    az deployment sub show \
        --name "$DEPLOYMENT_NAME" \
        --query properties.outputs \
        --output table
else
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
fi

# Save deployment outputs to file
OUTPUT_FILE="deployment-outputs-${ENVIRONMENT}.json"
az deployment sub show \
    --name "$DEPLOYMENT_NAME" \
    --query properties.outputs \
    --output json > "$OUTPUT_FILE"

echo -e "${GREEN}Deployment outputs saved to $OUTPUT_FILE${NC}"