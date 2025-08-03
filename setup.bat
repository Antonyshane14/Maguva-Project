@echo off
echo ========================================
echo   Boutique Management System Setup
echo ========================================
echo.

REM Check if Node.js is installed
echo [1/7] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo Please download and install Node.js from: https://nodejs.org/
    echo Then run this script again.
    pause
    exit /b 1
)
echo ✅ Node.js is installed

REM Check if MongoDB is installed
echo [2/7] Checking MongoDB...
mongod --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ MongoDB is not installed!
    echo Please download and install MongoDB from: https://www.mongodb.com/try/download/community
    echo Then run this script again.
    pause
    exit /b 1
)
echo ✅ MongoDB is installed

REM Create MongoDB data directory
echo [3/7] Setting up MongoDB data directory...
if not exist "C:\data\db" (
    mkdir "C:\data\db" 2>nul
    echo ✅ Created MongoDB data directory
) else (
    echo ✅ MongoDB data directory already exists
)

REM Install backend dependencies
echo [4/7] Installing backend dependencies...
cd backend
if exist package.json (
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install backend dependencies
        pause
        exit /b 1
    )
    echo ✅ Backend dependencies installed
) else (
    echo ❌ Backend package.json not found!
    pause
    exit /b 1
)

REM Install frontend dependencies
echo [5/7] Installing frontend dependencies...
cd ..\frontend
if exist package.json (
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install frontend dependencies
        pause
        exit /b 1
    )
    echo ✅ Frontend dependencies installed
) else (
    echo ❌ Frontend package.json not found!
    pause
    exit /b 1
)

REM Create environment files if they don't exist
echo [6/8] Setting up environment files...
cd ..
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env" >nul 2>&1
    echo ✅ Created backend .env file
)
if not exist "frontend\.env" (
    copy "frontend\.env.example" "frontend\.env" >nul 2>&1
    echo ✅ Created frontend .env file
)

REM Start MongoDB and create test users
echo [7/8] Setting up database and test users...
echo Starting MongoDB...
start /B mongod --dbpath C:\data\db --logpath C:\data\db\mongodb.log
timeout /t 3 /nobreak >nul

echo Creating test users...
cd backend
node scripts/create-test-users.js
if %errorlevel% neq 0 (
    echo ⚠️  Could not create test users automatically
    echo You can create them later by running: node scripts/create-test-users.js
)
cd ..

echo [8/8] Setup complete!
echo.
echo ========================================
echo   🎉 Installation Successful!
echo ========================================
echo.
echo To start the application, run: start.bat
echo To stop the application, run: stop.bat
echo.
echo Access your boutique system at: http://localhost:3000
echo Login with: admin / admin123
echo.
pause
