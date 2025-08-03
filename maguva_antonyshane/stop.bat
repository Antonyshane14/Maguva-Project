@echo off
echo ========================================
echo   Stopping Boutique Management System
echo ========================================
echo.

echo [1/3] Stopping Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js processes stopped
) else (
    echo ℹ️  No Node.js processes were running
)

echo [2/3] Stopping MongoDB (optional)...
REM Uncomment the next line if you want to stop MongoDB when stopping the app
REM net stop MongoDB >nul 2>&1

echo [3/3] Cleanup complete!
echo.
echo ========================================
echo   🛑 Application Stopped
echo ========================================
echo.
echo The boutique management system has been stopped.
echo MongoDB is still running (as it should be for data persistence).
echo.
echo To start again, run: start.bat
echo.
pause
