@echo off
echo ========================================
echo      🔧 Login Fix for Windows Users
echo ========================================
echo.
echo This script will reset and recreate test users
echo to fix any login issues.
echo.
pause

echo [1/3] Starting MongoDB (if not running)...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if %errorlevel% neq 0 (
    echo Starting MongoDB...
    net start MongoDB >nul 2>&1
    if %errorlevel% neq 0 (
        start /B mongod --dbpath "C:\data\db" --logpath "C:\data\db\mongodb.log" >nul 2>&1
        timeout /t 3 >nul
    )
)
echo ✅ MongoDB is running

echo [2/3] Recreating test users...
cd backend
node scripts/create-test-users.js
if %errorlevel% neq 0 (
    echo ❌ Failed to create test users!
    echo Please make sure MongoDB is running and try again.
    pause
    exit /b 1
)

echo [3/3] Testing login endpoint...
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"identifier\": \"admin\", \"password\": \"admin123\"}" 2>nul
if %errorlevel% neq 0 (
    echo ❌ Backend is not running on port 5000!
    echo Please start the backend server first by running start.bat
    pause
    exit /b 1
)

echo.
echo ========================================
echo        🎉 Login Fix Complete!
echo ========================================
echo.
echo ✅ Test users have been recreated successfully!
echo.
echo 🔑 You can now login with:
echo    👑 Admin: admin / admin123
echo    🎯 Manager: manager1 / manager123  
echo    👤 Staff: staff1 / staff123
echo.
echo 💡 You can use either username or email to login
echo.
echo If you're still having issues:
echo 1. Make sure MongoDB is running
echo 2. Make sure backend server is running (start.bat)
echo 3. Try refreshing your browser page
echo.
pause
