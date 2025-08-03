# 🔧 LOGIN TROUBLESHOOTING GUIDE FOR WINDOWS

## 🚨 If you can't login, follow these steps:

### Step 1: Recreate Test Users
```batch
cd backend
node scripts\create-test-users.js
```

### Step 2: Test API Connection

#### Option A: Using PowerShell (Recommended)
```powershell
# Run this in PowerShell
.\test-login.ps1
```

#### Option B: Using Command Prompt
```batch
# Run this in Command Prompt
test-login.bat
```

#### Option C: Manual curl (Windows CMD)
```batch
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"identifier\": \"admin\", \"password\": \"admin123\"}"
```

### Step 3: Check if MongoDB is Running
```batch
# Check if MongoDB service is running
sc query MongoDB
# OR
net start MongoDB
```

### Step 4: Check Backend Server
Make sure you see this in the backend console:
```
✅ Server running on port 5000
✅ MongoDB connected successfully
```

### Step 5: Check Frontend URL
Make sure frontend is accessing: `http://localhost:3000`

## 🔑 TEST CREDENTIALS

| Role    | Username | Password   | Email              |
|---------|----------|------------|-------------------|
| Admin   | admin    | admin123   | admin@boutique.com |
| Manager | manager1 | manager123 | manager1@boutique.com |
| Staff   | staff1   | staff123   | staff1@boutique.com |

**Note: You can login with either username OR email**

## 🚫 COMMON ISSUES & FIXES

### Issue 1: "Invalid credentials"
- ✅ **Fix**: Run `node scripts\create-test-users.js` in backend folder
- ✅ **Fix**: Make sure you're using the exact credentials above

### Issue 2: "Cannot connect to server"
- ✅ **Fix**: Make sure backend is running on port 5000
- ✅ **Fix**: Check if MongoDB service is started

### Issue 3: "JSON parse error" (curl)
- ✅ **Fix**: Use PowerShell instead of Command Prompt
- ✅ **Fix**: Use the test scripts provided above

### Issue 4: Frontend login form not working
- ✅ **Fix**: Clear browser cache and cookies
- ✅ **Fix**: Try in incognito/private browsing mode
- ✅ **Fix**: Check browser developer console for errors (F12)

## 🆘 QUICK RESET (Nuclear Option)

If nothing works, run these commands in order:

```batch
# 1. Stop all processes
taskkill /f /im node.exe

# 2. Navigate to project
cd /d D:\Gigs\Maguva-Project\maguva_antonyshane

# 3. Start fresh
start.bat

# 4. Wait 30 seconds, then create users
cd backend
node scripts\create-test-users.js

# 5. Test login
cd ..
test-login.ps1
```

## 📞 STILL HAVING ISSUES?

1. 📋 Copy and paste the EXACT error message
2. 📷 Take a screenshot of what you see
3. 🔄 Share the output of `test-login.ps1`

**The system works perfectly when set up correctly! 🎯**
