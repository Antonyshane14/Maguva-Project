@echo off
echo 🧪 Testing Login API on Windows...
echo.

echo 📋 Testing Admin Login:
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"identifier\": \"admin\", \"password\": \"admin123\"}"
echo.
echo.

echo 📋 Testing Manager Login:
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"identifier\": \"manager1\", \"password\": \"manager123\"}"
echo.
echo.

echo 📋 Testing Staff Login:
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"identifier\": \"staff1\", \"password\": \"staff123\"}"
echo.
echo.

echo ✅ Login tests completed!
pause
