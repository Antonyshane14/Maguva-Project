# 🚀 Quick Setup for Friends (Windows & Linux/Mac)

## Super Easy 3-Step Setup

### Step 1: Prerequisites (5 minutes)
Download and install these (if you don't have them):
1. **Node.js**: https://nodejs.org/ (Download LTS version - v18 or higher)
2. **Git**: https://git-scm.com/downloads
3. **MongoDB**: https://www.mongodb.com/try/download/community

#### Windows Users:
- Install MongoDB as a Windows Service (recommended)
- Make sure to add MongoDB to your PATH during installation

#### Mac Users:
- You can also install via Homebrew: `brew install mongodb-community`

### Step 2: Get the Code (1 minute)
```bash
# Clone this repository
git clone [REPOSITORY_URL]
cd boutique-management-system

# For WINDOWS users:
setup.bat

# For LINUX/MAC users:
chmod +x setup.sh
./setup.sh
```

### Step 3: Start Everything (1 minute)
```bash
# For WINDOWS users:
start.bat

# For LINUX/MAC users:
./start.sh
```

That's it! 🎉

## 🌐 Open Your Browser
- Go to: **http://localhost:3000**
- Login with: **admin** / **admin123**

## 🛑 To Stop
```bash
# For WINDOWS users:
stop.bat

# For LINUX/MAC users:
./stop.sh

# Or press Ctrl+C in the terminal
```

## 💡 What You Get
- ✅ Complete boutique management system
- ✅ User authentication (Admin/Manager/Staff)
- ✅ Product management
- ✅ Customer database
- ✅ Point of sale (POS)
- ✅ Inventory tracking
- ✅ Sales reports
- ✅ Beautiful responsive UI

## 🆘 If Something Goes Wrong

### "Command not found" errors:
Make sure you installed Node.js, Git, and MongoDB

### "Port already in use":
```bash
# Windows:
stop.bat
start.bat

# Linux/Mac:
./stop.sh
./start.sh
```

### "MongoDB connection error":
```bash
# On Windows:
net start MongoDB
# OR manually start: mongod --dbpath "C:\data\db"

# On Mac:
brew services start mongodb-community
# OR: sudo mongod --dbpath /usr/local/var/mongodb

# On Linux:
sudo systemctl start mongod
# OR: sudo mongod --dbpath /var/lib/mongodb
```

### Windows-specific issues:
- Make sure you run Command Prompt as Administrator for MongoDB setup
- If MongoDB service fails, try manual start: `mongod --dbpath "C:\data\db"`
- Check Windows Firewall isn't blocking ports 3000 and 5000

### Still having issues?
1. Restart your computer
2. Try the setup again
3. Check that ports 3000 and 5000 are free
4. Ensure antivirus isn't blocking the applications

## 🎯 Test Accounts
- **Admin**: username `admin`, password `admin123`
- **Manager**: username `manager1`, password `manager123`
- **Staff**: username `staff1`, password `staff123`

Have fun exploring! 🏪
