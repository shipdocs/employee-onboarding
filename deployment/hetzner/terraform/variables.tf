# Maritime Onboarding System - Terraform Variables
# Context7-based configuration for Hetzner Cloud deployment

variable "hcloud_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Name of the project (used for resource naming)"
  type        = string
  default     = "maritime-onboarding"
  
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "server_type" {
  description = "Hetzner Cloud server type"
  type        = string
  default     = "cx21"
  
  validation {
    condition = contains([
      "cx11", "cx21", "cx31", "cx41", "cx51",
      "cpx11", "cpx21", "cpx31", "cpx41", "cpx51"
    ], var.server_type)
    error_message = "Server type must be a valid Hetzner Cloud server type."
  }
}

variable "location" {
  description = "Hetzner Cloud location"
  type        = string
  default     = "nbg1"
  
  validation {
    condition = contains([
      "nbg1", "fsn1", "hel1", "ash", "hil"
    ], var.location)
    error_message = "Location must be a valid Hetzner Cloud location."
  }
}

variable "server_image" {
  description = "Server image to use"
  type        = string
  default     = "ubuntu-22.04"
}

variable "volume_size" {
  description = "Size of the data volume in GB"
  type        = number
  default     = 50
  
  validation {
    condition     = var.volume_size >= 10 && var.volume_size <= 16384
    error_message = "Volume size must be between 10 and 16384 GB."
  }
}

variable "ssh_public_key_path" {
  description = "Path to SSH public key file"
  type        = string
  default     = "~/.ssh/maritime_deployment.pub"
}

variable "ssh_private_key_path" {
  description = "Path to SSH private key file"
  type        = string
  default     = "~/.ssh/maritime_deployment"
}

variable "domain" {
  description = "Domain name for the application"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z0-9.-]+\\.[a-z]{2,}$", var.domain))
    error_message = "Domain must be a valid domain name."
  }
}

variable "ssl_email" {
  description = "Email address for SSL certificate registration"
  type        = string
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.ssl_email))
    error_message = "SSL email must be a valid email address."
  }
}

# SMTP Configuration
variable "smtp_host" {
  description = "SMTP server hostname"
  type        = string
  default     = ""
}

variable "smtp_user" {
  description = "SMTP username"
  type        = string
  default     = ""
}

variable "smtp_password" {
  description = "SMTP password"
  type        = string
  default     = ""
  sensitive   = true
}

variable "smtp_from" {
  description = "From email address"
  type        = string
  default     = ""
}

# Security Configuration
variable "security_email" {
  description = "Email address for security alerts"
  type        = string
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.security_email))
    error_message = "Security email must be a valid email address."
  }
}

variable "devops_email" {
  description = "Email address for DevOps alerts"
  type        = string
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.devops_email))
    error_message = "DevOps email must be a valid email address."
  }
}

# Optional: Backup configuration
variable "enable_backups" {
  description = "Enable automatic backups for the server"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
  
  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 365
    error_message = "Backup retention must be between 1 and 365 days."
  }
}

# Optional: Monitoring configuration
variable "enable_monitoring" {
  description = "Enable monitoring stack (Prometheus + Grafana)"
  type        = bool
  default     = false
}

# Optional: Resource tags
variable "additional_labels" {
  description = "Additional labels to apply to all resources"
  type        = map(string)
  default     = {}
}
