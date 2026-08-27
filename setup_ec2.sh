#!/bin/bash
# ==============================================================================
# HR Recruitment & Management System — One-Click AWS EC2 Provisioning Script
# Target OS: Ubuntu 22.04 LTS / 24.04 LTS on AWS EC2 (Free Tier t2.micro/t3.micro)
# ==============================================================================

set -e

echo "🚀 Starting Automated AWS EC2 Server Setup..."

# 1. System Updates & Essential Packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban nginx mysql-server

# 2. Configure 2GB Swap Memory (Crucial for 1GB RAM Free-Tier t2.micro/t3.micro)
if [ ! -f /swapfile ]; then
    echo "💾 Creating 2GB Swap Memory..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 3. Install Node.js (v20 LTS) & PM2
echo "📦 Installing Node.js 20 LTS & PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 4. Configure MySQL Database
echo "🗄️ Initializing MySQL Database..."
DB_PASS="hr_db_secure_pass_2026"
sudo mysql -e "CREATE DATABASE IF NOT EXISTS hr_recruitment_db;"
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -e "FLUSH PRIVILEGES;"

# 5. Import Canonical Schema
echo "📄 Importing Database Schema..."
mysql -u root -p"${DB_PASS}" hr_recruitment_db < database/schema.sql

# 6. Setup Backend Environment & Install Dependencies
echo "⚙️ Setting up Node.js Backend..."
cat <<EOF > backend/.env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=${DB_PASS}
DB_NAME=hr_recruitment_db
PORT=5000
NODE_ENV=production
CLIENT_ORIGIN=http://localhost
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d
HR_ADMIN_SECRET=admin123
AWS_REGION=us-east-1
EOF

cd backend
npm install --production
node seeder.js
cd ..

# 7. Setup & Build Frontend
echo "⚛️ Building Production React Frontend..."
cd frontend
npm install
npm run build
cd ..

# 8. Start Backend with PM2
echo "⚡ Starting Backend with PM2..."
pm2 start ecosystem.config.js
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# 9. Configure Nginx Reverse Proxy
echo "🌐 Configuring Nginx Reverse Proxy..."
sudo cp nginx.conf /etc/nginx/sites-available/hr-system
sudo ln -sf /etc/nginx/sites-available/hr-system /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 10. Configure Security Firewall (UFW)
echo "🛡️ Configuring Firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo ""
echo "=========================================================================="
echo "🎉 DEPLOYMENT COMPLETE! Your HR System is live!"
echo "🌐 Public URL: http://$(curl -s http://checkip.amazonaws.com)"
echo "🔑 HR Admin : Username: admin | Password: admin123"
echo "🔑 Employee : Username: eva   | Password: user123"
echo "=========================================================================="
