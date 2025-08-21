#!/bin/bash

# Maritime Onboarding System - Encryption Setup Script
# This script sets up encryption at rest and secrets management

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SECRETS_DIR="./secrets"
ENCRYPTED_VOLUME_SIZE="10G"
ENCRYPTED_VOLUME_PATH="/opt/maritime-encrypted.img"
MOUNT_POINT="/mnt/maritime_encrypted"

echo -e "${RED}🚨 CRITICAL: ENCRYPTION SETUP${NC}"
echo "=================================================="
echo -e "${YELLOW}⚠️  WARNING: This will enable encryption for your Maritime Onboarding System${NC}"
echo ""
echo -e "${RED}🔑 KEY MANAGEMENT RESPONSIBILITY:${NC}"
echo "• YOU are responsible for backing up encryption keys"
echo "• LOST KEYS = PERMANENT DATA LOSS (no recovery possible)"
echo "• You MUST store keys in multiple secure locations"
echo "• You MUST test key recovery procedures"
echo ""
echo -e "${BLUE}📋 What this script will do:${NC}"
echo "• Generate strong encryption keys"
echo "• Set up encrypted storage volumes"
echo "• Configure database encryption"
echo "• Create backup procedures"
echo ""

# Function to generate secure random key
generate_key() {
    local key_length=$1
    openssl rand -hex $key_length
}

# Function to generate secure password
generate_password() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Check if running as root for volume operations
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${YELLOW}⚠️  Running as root - volume encryption will be available${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Not running as root - volume encryption will be skipped${NC}"
        return 1
    fi
}

# Install required packages
install_dependencies() {
    echo -e "${BLUE}📦 Installing encryption dependencies...${NC}"
    
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y cryptsetup-bin openssl
    elif command -v yum &> /dev/null; then
        sudo yum install -y cryptsetup openssl
    else
        echo -e "${RED}❌ Unsupported package manager. Please install cryptsetup and openssl manually.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Create secrets directory structure
setup_secrets_directory() {
    echo -e "${BLUE}📁 Setting up secrets directory...${NC}"
    
    # Create secrets directory with restricted permissions
    mkdir -p "$SECRETS_DIR"
    chmod 700 "$SECRETS_DIR"
    
    # Create subdirectories
    mkdir -p "$SECRETS_DIR/keys"
    mkdir -p "$SECRETS_DIR/passwords"
    mkdir -p "$SECRETS_DIR/certificates"
    mkdir -p "$SECRETS_DIR/backups"
    
    # Set restrictive permissions
    chmod 700 "$SECRETS_DIR"/*
    
    echo -e "${GREEN}✅ Secrets directory structure created${NC}"
}

# Generate encryption keys
generate_encryption_keys() {
    echo -e "${BLUE}🔑 Generating encryption keys...${NC}"
    
    # Volume encryption key (for LUKS)
    if [[ ! -f "$SECRETS_DIR/keys/volume_encryption.key" ]]; then
        generate_password 64 > "$SECRETS_DIR/keys/volume_encryption.key"
        chmod 600 "$SECRETS_DIR/keys/volume_encryption.key"
        echo -e "${GREEN}✅ Volume encryption key generated${NC}"
    fi
    
    # Field encryption key (32 bytes for AES-256)
    if [[ ! -f "$SECRETS_DIR/keys/field_encryption.key" ]]; then
        generate_key 32 > "$SECRETS_DIR/keys/field_encryption.key"
        chmod 600 "$SECRETS_DIR/keys/field_encryption.key"
        echo -e "${GREEN}✅ Field encryption key generated${NC}"
    fi
    
    # JWT secret (64 bytes)
    if [[ ! -f "$SECRETS_DIR/keys/jwt_secret.key" ]]; then
        generate_key 64 > "$SECRETS_DIR/keys/jwt_secret.key"
        chmod 600 "$SECRETS_DIR/keys/jwt_secret.key"
        echo -e "${GREEN}✅ JWT secret generated${NC}"
    fi
    
    # Database encryption key
    if [[ ! -f "$SECRETS_DIR/keys/database_encryption.key" ]]; then
        generate_key 32 > "$SECRETS_DIR/keys/database_encryption.key"
        chmod 600 "$SECRETS_DIR/keys/database_encryption.key"
        echo -e "${GREEN}✅ Database encryption key generated${NC}"
    fi
    
    # Backup encryption key
    if [[ ! -f "$SECRETS_DIR/keys/backup_encryption.key" ]]; then
        generate_password 64 > "$SECRETS_DIR/keys/backup_encryption.key"
        chmod 600 "$SECRETS_DIR/keys/backup_encryption.key"
        echo -e "${GREEN}✅ Backup encryption key generated${NC}"
    fi
}

# Generate database passwords
generate_database_passwords() {
    echo -e "${BLUE}🔐 Generating database passwords...${NC}"
    
    # PostgreSQL admin password
    if [[ ! -f "$SECRETS_DIR/passwords/postgres_admin.txt" ]]; then
        generate_password 32 > "$SECRETS_DIR/passwords/postgres_admin.txt"
        chmod 600 "$SECRETS_DIR/passwords/postgres_admin.txt"
        echo -e "${GREEN}✅ PostgreSQL admin password generated${NC}"
    fi
    
    # Application database password
    if [[ ! -f "$SECRETS_DIR/passwords/app_database.txt" ]]; then
        generate_password 32 > "$SECRETS_DIR/passwords/app_database.txt"
        chmod 600 "$SECRETS_DIR/passwords/app_database.txt"
        echo -e "${GREEN}✅ Application database password generated${NC}"
    fi
}

# Create encrypted volume
create_encrypted_volume() {
    if ! check_root; then
        echo -e "${YELLOW}⚠️  Skipping volume encryption (requires root)${NC}"
        return 0
    fi
    
    echo -e "${BLUE}💾 Creating encrypted volume...${NC}"
    
    # Check if volume already exists
    if [[ -f "$ENCRYPTED_VOLUME_PATH" ]]; then
        echo -e "${YELLOW}⚠️  Encrypted volume already exists at $ENCRYPTED_VOLUME_PATH${NC}"
        return 0
    fi
    
    # Create volume file
    echo -e "${BLUE}📁 Creating volume file ($ENCRYPTED_VOLUME_SIZE)...${NC}"
    sudo dd if=/dev/zero of="$ENCRYPTED_VOLUME_PATH" bs=1M count=10240 status=progress
    
    # Setup LUKS encryption
    echo -e "${BLUE}🔒 Setting up LUKS encryption...${NC}"
    sudo cryptsetup luksFormat "$ENCRYPTED_VOLUME_PATH" "$SECRETS_DIR/keys/volume_encryption.key"
    
    # Open encrypted volume
    sudo cryptsetup luksOpen "$ENCRYPTED_VOLUME_PATH" maritime_encrypted --key-file="$SECRETS_DIR/keys/volume_encryption.key"
    
    # Create filesystem
    echo -e "${BLUE}📂 Creating filesystem...${NC}"
    sudo mkfs.ext4 /dev/mapper/maritime_encrypted
    
    # Create mount point
    sudo mkdir -p "$MOUNT_POINT"
    
    # Mount volume
    sudo mount /dev/mapper/maritime_encrypted "$MOUNT_POINT"
    
    # Set permissions
    sudo chown -R 999:999 "$MOUNT_POINT"  # PostgreSQL user
    
    echo -e "${GREEN}✅ Encrypted volume created and mounted${NC}"
}

# Function to get user confirmation
get_user_confirmation() {
    echo -e "${YELLOW}Do you understand and accept the key management responsibility?${NC}"
    echo "Type 'I UNDERSTAND AND ACCEPT' to continue:"
    read -r user_response

    if [[ "$user_response" != "I UNDERSTAND AND ACCEPT" ]]; then
        echo -e "${RED}❌ Setup cancelled. Encryption not enabled.${NC}"
        echo -e "${GREEN}💡 Your system will continue to work normally without encryption.${NC}"
        exit 0
    fi

    echo ""
    echo -e "${YELLOW}Are you ready to proceed with encryption setup?${NC}"
    echo "Type 'YES' to continue:"
    read -r final_confirmation

    if [[ "$final_confirmation" != "YES" ]]; then
        echo -e "${RED}❌ Setup cancelled.${NC}"
        exit 0
    fi
}

# Main execution
main() {
    echo -e "${BLUE}Starting encryption setup...${NC}"

    # Get user confirmation first
    get_user_confirmation

    # Check if Docker is running
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
    
    # Install dependencies
    install_dependencies
    
    # Setup secrets
    setup_secrets_directory
    generate_encryption_keys
    generate_database_passwords
    
    # Setup volume encryption (if root)
    create_encrypted_volume
    
    echo -e "${GREEN}🎉 Encryption setup completed!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo "1. Update .env file with generated secrets"
    echo "2. Restart Docker services with encrypted volumes"
    echo "3. Run database migration to enable field encryption"
    echo ""
    echo -e "${YELLOW}⚠️  Important: Backup the secrets directory securely!${NC}"
}

# Run main function
main "$@"
