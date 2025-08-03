# 🏪 Boutique Management System - Complete Setup Guide

## 📋 Prerequisites

Before starting, make sure you have these installed on your system:

### Required Software:
1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **MongoDB** - [Download here](https://www.mongodb.com/try/download/community)
3. **Git** - [Download here](https://git-scm.com/downloads)

### Check if you have them:
```bash
node --version    # Should show v16+ 
npm --version     # Should show 8+
git --version     # Should show 2+
mongod --version  # Should show MongoDB version
```

## 🚀 Quick Start (Automated Setup)

### Option 1: One-Command Setup (Recommended)
```bash
# Clone and setup everything automatically
git clone <repository-url>
cd boutique-management-system
./setup.sh
```

### Option 2: Manual Setup
If you prefer to understand each step:

#### Step 1: Clone Repository
```bash
git clone <repository-url>
cd boutique-management-system
```

#### Step 2: Setup Backend
```bash
cd backend
npm install
cp .env.example .env
```

#### Step 3: Setup Frontend
```bash
cd ../frontend
npm install
cp .env.example .env
```

#### Step 4: Start MongoDB
```bash
# On Windows:
net start MongoDB

# On macOS (with Homebrew):
brew services start mongodb-community

# On Linux:
sudo systemctl start mongod
# OR
mongod --dbpath ./data/db
```

#### Step 5: Start Applications
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend (new terminal)
cd frontend
npm start
```

## 🌐 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/health

## 👤 Test Credentials

### Admin User (Full Access)
- **Username**: `admin`
- **Email**: `admin@boutique.com`
- **Password**: `admin123`

### Manager User
- **Username**: `manager1`
- **Email**: `manager@boutique.com`
- **Password**: `manager123`

### Staff User
- **Username**: `staff1`
- **Email**: `staff@boutique.com`
- **Password**: `staff123`

## 🛠 Troubleshooting

### Common Issues:

#### 1. "MongoDB connection error"
```bash
# Make sure MongoDB is running
sudo systemctl status mongod  # Linux
brew services list | grep mongo  # macOS
```

#### 2. "Port already in use"
```bash
# Kill processes on ports 3000 and 5000
sudo lsof -ti:3000 | xargs kill -9
sudo lsof -ti:5000 | xargs kill -9
```

#### 3. "Module not found"
```bash
# Reinstall dependencies
cd backend && npm install
cd ../frontend && npm install
```

#### 4. "Permission denied"
```bash
# Fix MongoDB data directory permissions
sudo mkdir -p /data/db
sudo chown -R $USER:$USER /data/db
```

## 📁 Project Structure
```
boutique-management-system/
├── backend/           # Node.js/Express API
├── frontend/          # React/TypeScript UI
├── setup.sh          # Automated setup script
├── start.sh           # Start both servers
├── README.md          # This file
└── docs/              # Additional documentation
```

## 🔧 Development Commands

```bash
# Backend commands
cd backend
npm run dev        # Start with nodemon (auto-restart)
npm test           # Run tests
npm run lint       # Check code style

# Frontend commands
cd frontend
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
```

## 📱 Features

- 🔐 User Authentication (Admin/Manager/Staff roles)
- 📦 Product Management
- 👥 Customer Management
- 🛒 Point of Sale (POS)
- 📊 Inventory Tracking
- 📈 Sales Reports & Analytics
- 💳 Multi-payment Support
- 🧾 GST Calculations
- 📱 Responsive Design

## ⚙️ Configuration

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/boutique
JWT_SECRET=your-secret-key
JWT_EXPIRE=24h
NODE_ENV=development
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
GENERATE_SOURCEMAP=false
```

## 🆘 Need Help?

1. Check the troubleshooting section above
2. Look at the logs in terminal
3. Ensure all prerequisites are installed
4. Try the automated setup script

## 📞 Support

If you encounter any issues:
1. Check if all services are running
2. Verify your environment variables
3. Make sure ports 3000 and 5000 are free
4. Restart MongoDB if connection fails

Happy coding! 🎉
