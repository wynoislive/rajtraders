#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# RAJ TRADERS — Automated Debian 13 VPS Setup Script
# Run as root: sudo bash setup-vps.sh
# ─────────────────────────────────────────────────────────────

set -e

echo "🚀 [RAJ TRADERS] Initializing Debian 13 VPS Setup..."

# 1. Update OS packages
echo "📦 Updating OS repositories..."
apt-get update && apt-get upgrade -y

# 2. Install essential tools and Docker dependencies
echo "📦 Installing prerequisites..."
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release ufw htop fail2ban

# 3. Configure 2GB Swap space (Optimizes 4GB RAM VPS)
if [ ! -f /swapfile ]; then
    echo "🧠 Configuring 2GB Swap memory..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

# 4. Install official Docker Engine & Docker Compose Plugin
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
fi

# 5. Configure UFW Firewall (Shield ports)
echo "🛡️ Configuring Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Nginx)
ufw allow 443/tcp   # HTTPS (Nginx)
ufw --force enable

# 6. Create directories
mkdir -p certs nginx/conf.d uploads/products

echo ""
echo "✅ [SUCCESS] Debian 13 VPS is prepared!"
echo "Next steps:"
echo "1. Place your Cloudflare Origin SSL Certificate into ./certs/api.sundarvan.xyz.crt and ./certs/api.sundarvan.xyz.key"
echo "2. Copy .env.production.example to .env and configure secrets."
echo "3. Run: docker compose up -d --build"
