# 🪟 Windows Setup Guide - Boutique Management System

Hey! Your friend wants you to test this awesome boutique management system. Here's how to get it running on Windows in just a few minutes!

## 📋 What You Need (One-time setup)

### 1. Install Node.js
- Go to: https://nodejs.org/
- Download the **LTS version** (the green button)
- Run the installer and click "Next" through everything
- ✅ This gives you Node.js and npm

### 2. Install Git
- Go to: https://git-scm.com/download/win
- Download and install with default settings
- ✅ This lets you download the code

### 3. Install MongoDB
- Go to: https://www.mongodb.com/try/download/community
- Download **MongoDB Community Server** for Windows
- During installation:
  - ✅ Check "Install MongoDB as a Service"
  - ✅ Check "Install MongoDB Compass" (optional but helpful)
- ✅ This is your database

## 🚀 Get the Code & Run It

### Step 1: Download the code
```cmd
# Open Command Prompt and run:
git clone [YOUR_FRIEND_WILL_GIVE_YOU_THE_URL]
cd boutique-management-system
```

### Step 2: Setup everything
```cmd
# Just double-click this file OR run in Command Prompt:
setup.bat
```
*This installs all the needed packages automatically*

### Step 3: Start the application
```cmd
# Just double-click this file OR run in Command Prompt:
start.bat
```
*This starts everything and opens your browser automatically*

## 🎉 You're Done!

The application will open in your browser at: **http://localhost:3000**

**Login with:**
- Username: `admin`
- Password: `admin123`

## 🛑 To Stop the Application
```cmd
# Just double-click this file:
stop.bat
```

## 🔧 What You Get
- Complete boutique/store management system
- User management (Admin, Manager, Staff roles)
- Product catalog
- Customer database
- Point of Sale (POS) system
- Inventory tracking
- Sales reports
- Modern, responsive web interface

## 🆘 Troubleshooting

### If setup.bat fails:
1. Make sure you installed Node.js, Git, and MongoDB
2. Restart Command Prompt as Administrator
3. Try running `setup.bat` again

### If start.bat fails:
1. Run `stop.bat` first
2. Then run `start.bat` again
3. Check if MongoDB service is running: `net start MongoDB`

### If you can't access http://localhost:3000:
1. Check Windows Firewall settings
2. Make sure no other applications are using ports 3000 or 5000
3. Try restarting your computer

### Still stuck?
- Make sure all installations completed successfully
- Try running Command Prompt as Administrator
- Contact your friend who shared this with you!

## 📱 Test Accounts
Once you're logged in, you can also test these accounts:

**Manager Account:**
- Username: `manager1`
- Password: `manager123`

**Staff Account:**
- Username: `staff1`
- Password: `staff123`

Each role has different permissions and access levels.

---

**Enjoy exploring the boutique management system! 🏪✨**

*Built with React, Node.js, Express, and MongoDB*
