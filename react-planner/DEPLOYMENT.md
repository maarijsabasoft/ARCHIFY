# Archify Deployment Guide - AWS EC2

## Prerequisites
- AWS Account
- GitHub Account
- Domain name (optional, for production)

---

## Part 1: Push Code to GitHub

### 1.1 Initialize Git Repository (if not already)
```bash
cd ARCHIFY/react-planner
git init
git add .
git commit -m "Initial commit - Archify Floor Planner"
```

### 1.2 Create GitHub Repository
1. Go to https://github.com/new
2. Create a new repository named `archify` (or your preferred name)
3. Don't initialize with README (we already have code)

### 1.3 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/archify.git
git branch -M main
git push -u origin main
```

---

## Part 2: AWS EC2 Setup

### 2.1 Launch EC2 Instance

1. **Login to AWS Console** → EC2 → Launch Instance

2. **Choose AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)

3. **Instance Type**: 
   - Development: `t2.micro` (free tier)
   - Production: `t2.small` or `t2.medium`

4. **Key Pair**: Create new or use existing (.pem file)

5. **Security Group** - Allow these ports:
   | Type | Port | Source |
   |------|------|--------|
   | SSH | 22 | Your IP |
   | HTTP | 80 | Anywhere |
   | HTTPS | 443 | Anywhere |
   | Custom TCP | 5000 | Anywhere |
   | Custom TCP | 9001 | Anywhere |

6. **Storage**: 20-30 GB (gp2)

7. **Launch Instance**

### 2.2 Connect to EC2

```bash
# Make key file secure
chmod 400 your-key.pem

# Connect via SSH
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## Part 3: Server Setup

### 3.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 3.2 Install Node.js 18
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v18.x.x
```

### 3.3 Install Python 3.11
```bash
sudo apt install -y python3.11 python3.11-venv python3-pip
python3.11 --version
```

### 3.4 Install Nginx (Reverse Proxy)
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 3.5 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

---

## Part 4: Deploy Application

### 4.1 Clone Repository
```bash
cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/archify.git
cd archify/react-planner
```

### 4.2 Setup Backend (Flask)
```bash
# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cat > .env << EOF
GROQ_API_KEY=your_groq_api_key_here
SECRET_KEY=your_secret_key_here_change_in_production
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=your_sender_email_here
FRONTEND_URL=http://YOUR_EC2_PUBLIC_IP
EOF

# Test backend
python main.py
# Press Ctrl+C to stop after confirming it works
```

### 4.3 Setup Frontend (React)
```bash
cd demo

# Install dependencies
npm install

# Build for production
npm run build
```

### 4.4 Update API URLs for Production

Edit `demo/src/ui/auth-modals.jsx`:
```javascript
const API_BASE_URL = 'http://YOUR_EC2_PUBLIC_IP:5000/api/auth';
```

Edit `demo/src/ui/make-with-ai.jsx`:
```javascript
const API_BASE_URL = 'http://YOUR_EC2_PUBLIC_IP:5000/api';
```

Then rebuild:
```bash
npm run build
```

---

## Part 5: Configure Services

### 5.1 Create Backend Service with PM2
```bash
cd /home/ubuntu/archify/react-planner

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'archify-backend',
      script: 'main.py',
      interpreter: '/home/ubuntu/archify/react-planner/venv/bin/python',
      cwd: '/home/ubuntu/archify/react-planner',
      env: {
        FLASK_ENV: 'production',
        GROQ_API_KEY: 'your_groq_api_key_here',
        SECRET_KEY: 'your_secret_key_change_this',
        FRONTEND_URL: 'http://YOUR_EC2_PUBLIC_IP'
      }
    }
  ]
};
EOF

# Start backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5.2 Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/archify
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name YOUR_EC2_PUBLIC_IP;  # Or your domain name

    # Frontend - React App
    location / {
        root /home/ubuntu/archify/react-planner/demo/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        root /home/ubuntu/archify/react-planner/demo/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/archify /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## Part 6: SSL Certificate (HTTPS) - Optional but Recommended

### 6.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Get SSL Certificate (requires domain name)
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 6.3 Auto-renewal
```bash
sudo certbot renew --dry-run
```

---

## Part 7: Useful Commands

### Check Service Status
```bash
# Backend
pm2 status
pm2 logs archify-backend

# Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# Check ports
sudo netstat -tlnp
```

### Restart Services
```bash
pm2 restart archify-backend
sudo systemctl restart nginx
```

### Update Application
```bash
cd /home/ubuntu/archify/react-planner
git pull origin main

# Rebuild frontend
cd demo
npm install
npm run build

# Restart backend
pm2 restart archify-backend
```

---

## Part 8: Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `GROQ_API_KEY` | Groq API key for AI chat | Yes |
| `SECRET_KEY` | JWT secret key | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For Google login |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | For Google login |
| `RESEND_API_KEY` | Resend API for emails | For email verification |
| `RESEND_FROM_EMAIL` | Sender email address | For email verification |
| `FRONTEND_URL` | Frontend URL for emails | For email links |

---

## Troubleshooting

### Backend not starting
```bash
pm2 logs archify-backend --lines 50
```

### Nginx 502 Bad Gateway
```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Permission Issues
```bash
sudo chown -R ubuntu:ubuntu /home/ubuntu/archify
```

### Port Already in Use
```bash
sudo lsof -i :5000
sudo kill -9 <PID>
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      AWS EC2                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │                    Nginx (Port 80/443)            │  │
│  │  ┌─────────────────┐  ┌─────────────────────────┐ │  │
│  │  │   /api/*        │  │      /*                 │ │  │
│  │  │   Proxy to      │  │   Serve React          │ │  │
│  │  │   Flask :5000   │  │   Static Files         │ │  │
│  │  └────────┬────────┘  └─────────────────────────┘ │  │
│  └───────────┼───────────────────────────────────────┘  │
│              │                                          │
│  ┌───────────▼───────────┐  ┌─────────────────────────┐ │
│  │   Flask Backend       │  │   SQLite Database       │ │
│  │   (PM2 managed)       │  │   archify.db            │ │
│  │   - AI Chat API       │  └─────────────────────────┘ │
│  │   - Auth API          │                              │
│  │   - Groq Integration  │                              │
│  └───────────────────────┘                              │
└─────────────────────────────────────────────────────────┘
```

---

## Cost Estimate (AWS)

| Resource | Free Tier | Production |
|----------|-----------|------------|
| EC2 t2.micro | 750 hrs/month free | ~$8/month |
| EC2 t2.small | - | ~$17/month |
| EBS Storage (20GB) | 30GB free | ~$2/month |
| Data Transfer | 15GB free | ~$0.09/GB |

**Estimated Monthly Cost**: 
- Free tier: $0-5/month
- Production: $20-30/month

---

## Support

For issues, create a GitHub issue or contact the development team.

