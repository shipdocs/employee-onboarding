#!/bin/bash

# Maritime Onboarding System - Key Backup Script
# CRITICAL: This script creates secure backups of encryption keys

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SECRETS_DIR="./secrets"
BACKUP_BASE_DIR="./key-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$BACKUP_BASE_DIR/backup-$TIMESTAMP"

echo -e "${RED}🚨 CRITICAL KEY BACKUP OPERATION${NC}"
echo "=================================="
echo -e "${YELLOW}⚠️  WARNING: This operation handles sensitive encryption keys${NC}"
echo -e "${YELLOW}⚠️  Ensure you're in a secure environment${NC}"
echo ""

# Function to prompt for confirmation
confirm_operation() {
    local message="$1"
    echo -e "${YELLOW}$message${NC}"
    read -p "Type 'YES' to continue: " confirmation
    if [[ "$confirmation" != "YES" ]]; then
        echo -e "${RED}❌ Operation cancelled${NC}"
        exit 1
    fi
}

# Function to check if secrets exist
check_secrets_exist() {
    if [[ ! -d "$SECRETS_DIR" ]]; then
        echo -e "${RED}❌ Secrets directory not found: $SECRETS_DIR${NC}"
        exit 1
    fi
    
    if [[ ! -d "$SECRETS_DIR/keys" ]]; then
        echo -e "${RED}❌ Keys directory not found: $SECRETS_DIR/keys${NC}"
        exit 1
    fi
    
    local key_count=$(find "$SECRETS_DIR/keys" -name "*.key" | wc -l)
    if [[ $key_count -eq 0 ]]; then
        echo -e "${RED}❌ No encryption keys found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Found $key_count encryption keys${NC}"
}

# Function to create backup directory
create_backup_directory() {
    echo -e "${BLUE}📁 Creating backup directory...${NC}"
    mkdir -p "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"
    echo -e "${GREEN}✅ Backup directory created: $BACKUP_DIR${NC}"
}

# Function to copy secrets
copy_secrets() {
    echo -e "${BLUE}📋 Copying secrets...${NC}"
    
    # Copy entire secrets directory
    cp -r "$SECRETS_DIR"/* "$BACKUP_DIR/"
    
    # Set restrictive permissions
    find "$BACKUP_DIR" -type f -exec chmod 600 {} \;
    find "$BACKUP_DIR" -type d -exec chmod 700 {} \;
    
    echo -e "${GREEN}✅ Secrets copied successfully${NC}"
}

# Function to create encrypted archive
create_encrypted_archive() {
    echo -e "${BLUE}🔒 Creating encrypted archive...${NC}"
    
    # Prompt for encryption password
    echo -e "${YELLOW}Enter a strong password for the backup archive:${NC}"
    read -s backup_password
    echo ""
    echo -e "${YELLOW}Confirm the password:${NC}"
    read -s backup_password_confirm
    echo ""
    
    if [[ "$backup_password" != "$backup_password_confirm" ]]; then
        echo -e "${RED}❌ Passwords do not match${NC}"
        exit 1
    fi
    
    if [[ ${#backup_password} -lt 12 ]]; then
        echo -e "${RED}❌ Password must be at least 12 characters${NC}"
        exit 1
    fi
    
    # Create tar archive
    local archive_name="maritime-keys-backup-$TIMESTAMP.tar.gz"
    tar -czf "$BACKUP_BASE_DIR/$archive_name" -C "$BACKUP_BASE_DIR" "backup-$TIMESTAMP"
    
    # Encrypt the archive
    local encrypted_name="maritime-keys-backup-$TIMESTAMP.tar.gz.gpg"
    echo "$backup_password" | gpg --batch --yes --passphrase-fd 0 \
        --symmetric --cipher-algo AES256 \
        --compress-algo 1 --s2k-mode 3 \
        --s2k-digest-algo SHA512 \
        --s2k-count 65536 \
        --output "$BACKUP_BASE_DIR/$encrypted_name" \
        "$BACKUP_BASE_DIR/$archive_name"
    
    # Remove unencrypted archive
    rm "$BACKUP_BASE_DIR/$archive_name"
    
    echo -e "${GREEN}✅ Encrypted backup created: $BACKUP_BASE_DIR/$encrypted_name${NC}"
    
    # Clear password from memory
    unset backup_password
    unset backup_password_confirm
}

# Function to create checksum
create_checksum() {
    echo -e "${BLUE}🔍 Creating integrity checksum...${NC}"
    
    local encrypted_file=$(find "$BACKUP_BASE_DIR" -name "*$TIMESTAMP*.gpg")
    sha256sum "$encrypted_file" > "$encrypted_file.sha256"
    
    echo -e "${GREEN}✅ Checksum created${NC}"
}

# Function to verify backup
verify_backup() {
    echo -e "${BLUE}✅ Verifying backup integrity...${NC}"
    
    local encrypted_file=$(find "$BACKUP_BASE_DIR" -name "*$TIMESTAMP*.gpg")
    local checksum_file="$encrypted_file.sha256"
    
    if sha256sum -c "$checksum_file" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backup integrity verified${NC}"
    else
        echo -e "${RED}❌ Backup integrity check failed${NC}"
        exit 1
    fi
}

# Function to clean up temporary files
cleanup() {
    echo -e "${BLUE}🧹 Cleaning up temporary files...${NC}"
    rm -rf "$BACKUP_DIR"
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function to display backup information
display_backup_info() {
    local encrypted_file=$(find "$BACKUP_BASE_DIR" -name "*$TIMESTAMP*.gpg")
    local file_size=$(du -h "$encrypted_file" | cut -f1)
    
    echo ""
    echo -e "${GREEN}🎉 BACKUP COMPLETED SUCCESSFULLY${NC}"
    echo "================================="
    echo "📁 Backup file: $encrypted_file"
    echo "📊 File size: $file_size"
    echo "🕒 Created: $(date)"
    echo "🔒 Encryption: AES-256 with GPG"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
    echo "1. Store this backup in multiple secure locations"
    echo "2. Test the backup restoration process"
    echo "3. Document the backup password securely"
    echo "4. Consider creating additional backups"
    echo ""
    echo -e "${RED}🚨 CRITICAL: Without this backup, lost keys = lost data!${NC}"
}

# Function to suggest backup locations
suggest_backup_locations() {
    echo ""
    echo -e "${BLUE}💡 RECOMMENDED BACKUP LOCATIONS:${NC}"
    echo "================================="
    echo "1. 🔐 Encrypted USB drive (offline storage)"
    echo "2. ☁️  Secure cloud storage (encrypted)"
    echo "3. 🏢 Physical safe/vault (printed QR codes)"
    echo "4. 🏦 Bank safety deposit box"
    echo "5. 🤝 Trusted business partner location"
    echo ""
    echo -e "${YELLOW}Remember: Follow the 3-2-1 backup rule!${NC}"
    echo "- 3 copies of your data"
    echo "- 2 different storage media"
    echo "- 1 offsite backup"
}

# Main execution
main() {
    echo -e "${BLUE}Starting key backup process...${NC}"
    
    # Confirm operation
    confirm_operation "⚠️  Are you sure you want to create a key backup?"
    
    # Check prerequisites
    check_secrets_exist
    
    # Create backup
    create_backup_directory
    copy_secrets
    create_encrypted_archive
    create_checksum
    verify_backup
    cleanup
    
    # Display results
    display_backup_info
    suggest_backup_locations
    
    echo -e "${GREEN}✅ Key backup process completed successfully${NC}"
}

# Handle interruption
trap 'echo -e "\n${RED}❌ Backup interrupted. Cleaning up...${NC}"; cleanup; exit 1' INT TERM

# Run main function
main "$@"
