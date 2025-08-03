@echo off
echo ========================================
echo   Starting Boutique Management System
echo ========================================
echo.

REM Check if MongoDB is running, if not start it
echo [1/4] Starting MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if %errorlevel% neq 0 (
    echo Starting MongoDB service...
    net start MongoDB >nul 2>&1
    if %errorlevel% neq 0 (
        echo Starting MongoDB manually...
        start /B mongod --dbpath "C:\data\db" --logpath "C:\data\db\mongodb.log" >nul 2>&1
        timeout /t 3 >nul
    )
    echo ✅ MongoDB started
) else (
    echo ✅ MongoDB is already running
)

REM Start backend server
echo [2/4] Starting backend server...
cd backend
start /B cmd /C "npm start >nul 2>&1"
echo ✅ Backend server starting on port 5000...

REM Wait a moment for backend to start
timeout /t 3 >nul

REM Start frontend server
echo [3/4] Starting frontend server...
cd ..\frontend
start /B cmd /C "npm start >nul 2>&1"
echo ✅ Frontend server starting on port 3000...

echo [4/4] Waiting for servers to fully start...
timeout /t 5 >nul

echo.
echo ========================================
echo   🚀 Application Started Successfully!
echo ========================================
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend:  http://localhost:5000
echo.
echo 📋 Login Credentials:
echo    Username: admin
echo    Password: admin123
echo.
echo 🛑 To stop the application, run: stop.bat
echo.
echo Opening browser in 3 seconds...
timeout /t 3 >nul
start http://localhost:3000
