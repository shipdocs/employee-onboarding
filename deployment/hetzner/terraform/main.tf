# Maritime Onboarding System - Hetzner Cloud Terraform Configuration
# Based on Context7 best practices for production Docker deployments

terraform {
  required_version = ">= 1.0"
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
}

# Configure the Hetzner Cloud Provider
provider "hcloud" {
  token = var.hcloud_token
}

# Generate secure passwords
resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "random_password" "redis_password" {
  length  = 32
  special = true
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# SSH Key for server access
resource "hcloud_ssh_key" "deployment_key" {
  name       = "${var.project_name}-deployment-key"
  public_key = file(var.ssh_public_key_path)
  
  labels = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Private network for secure communication
resource "hcloud_network" "maritime_network" {
  name     = "${var.project_name}-network"
  ip_range = "10.0.0.0/16"
  
  labels = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Subnet for the application
resource "hcloud_network_subnet" "maritime_subnet" {
  type         = "cloud"
  network_id   = hcloud_network.maritime_network.id
  network_zone = "eu-central"
  ip_range     = "10.0.1.0/24"
}

# Firewall for security
resource "hcloud_firewall" "maritime_firewall" {
  name = "${var.project_name}-firewall"

  # SSH access
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "22"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  # HTTP access
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "80"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  # HTTPS access
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "443"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  # Internal network communication
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "any"
    source_ips = [
      "10.0.0.0/16"
    ]
  }

  labels = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Primary IP for static addressing
resource "hcloud_primary_ip" "maritime_ip" {
  name          = "${var.project_name}-primary-ip"
  datacenter    = "${var.location}-dc14"
  type          = "ipv4"
  assignee_type = "server"
  auto_delete   = false

  labels = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Volume for persistent data
resource "hcloud_volume" "maritime_data" {
  name     = "${var.project_name}-data"
  size     = var.volume_size
  location = var.location
  format   = "ext4"

  labels = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    type        = "data"
  }
}

# Main application server
resource "hcloud_server" "maritime_server" {
  name        = "${var.project_name}-server"
  image       = var.server_image
  server_type = var.server_type
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.deployment_key.id]
  firewall_ids = [hcloud_firewall.maritime_firewall.id]
  
  # Use the primary IP
  public_net {
    ipv4_enabled = true
    ipv4         = hcloud_primary_ip.maritime_ip.id
    ipv6_enabled = true
  }

  # Attach to private network
  network {
    network_id = hcloud_network.maritime_network.id
    ip         = "10.0.1.10"
  }

  # Cloud-init configuration
  user_data = templatefile("${path.module}/cloud-init.yml", {
    project_name = var.project_name
    environment  = var.environment
  })

  labels = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    role        = "application"
  }

  # Ensure network subnet exists before server creation
  depends_on = [
    hcloud_network_subnet.maritime_subnet
  ]
}

# Attach volume to server
resource "hcloud_volume_attachment" "maritime_data_attachment" {
  volume_id = hcloud_volume.maritime_data.id
  server_id = hcloud_server.maritime_server.id
  automount = true
}

# Generate environment file for Docker Compose
resource "local_file" "env_production" {
  content = templatefile("${path.module}/templates/.env.production.tpl", {
    db_password    = random_password.db_password.result
    redis_password = random_password.redis_password.result
    jwt_secret     = random_password.jwt_secret.result
    app_url        = "https://${var.domain}"
    domain         = var.domain
    ssl_email      = var.ssl_email
    smtp_host      = var.smtp_host
    smtp_user      = var.smtp_user
    smtp_password  = var.smtp_password
    smtp_from      = var.smtp_from
    security_email = var.security_email
    devops_email   = var.devops_email
  })
  filename = "${path.module}/../.env.production"
  
  # Secure file permissions
  file_permission = "0600"
}

# Reverse DNS for the server
resource "hcloud_rdns" "maritime_rdns" {
  server_id  = hcloud_server.maritime_server.id
  ip_address = hcloud_primary_ip.maritime_ip.ip_address
  dns_ptr    = var.domain
}

# Output important information
output "server_ip" {
  description = "Public IP address of the server"
  value       = hcloud_primary_ip.maritime_ip.ip_address
}

output "server_id" {
  description = "ID of the created server"
  value       = hcloud_server.maritime_server.id
}

output "ssh_command" {
  description = "SSH command to connect to the server"
  value       = "ssh -i ${var.ssh_private_key_path} root@${hcloud_primary_ip.maritime_ip.ip_address}"
}

output "application_url" {
  description = "URL where the application will be available"
  value       = "https://${var.domain}"
}

output "volume_mount_path" {
  description = "Path where the data volume is mounted"
  value       = "/mnt/maritime-data"
}
