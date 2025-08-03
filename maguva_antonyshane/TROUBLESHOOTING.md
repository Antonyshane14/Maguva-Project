# 🔧 Troubleshooting Guide

## Common Setup Issues & Solutions

### 1. "Node.js not found" or "npm not found"
**Problem**: Node.js is not installed or not in PATH
**Solution**:
- Download Node.js from https://nodejs.org/ (LTS version)
- Restart your terminal after installation
- Test with: `node --version`

### 2. "MongoDB connection error"
**Problem**: MongoDB is not running
**Solutions**:

#### Windows:
```bash
net start MongoDB
# OR if installed manually:
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath C:\data\db
```

#### macOS:
```bash
brew services start mongodb-community
# OR manually:
mongod --dbpath /usr/local/var/mongodb
```

#### Linux:
```bash
sudo systemctl start mongod
# OR manually:
mongod --dbpath /data/db
```

### 3. "Port 3000 is already in use"
**Problem**: Another application is using port 3000
**Solution**:
```bash
# Find and kill the process
sudo lsof -ti:3000 | xargs kill -9
# OR on Windows:
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

### 4. "Port 5000 is already in use"
**Problem**: Another application is using port 5000
**Solution**:
```bash
# Find and kill the process
sudo lsof -ti:5000 | xargs kill -9
# OR on Windows:
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

### 5. "Permission denied" on Linux/Mac
**Problem**: Insufficient permissions for MongoDB data directory
**Solution**:
```bash
sudo mkdir -p /data/db
sudo chown -R $USER:$USER /data/db
```

### 6. Frontend shows "Network Error" or "Cannot connect to backend"
**Problem**: Backend is not running or wrong API URL
**Solutions**:
- Check if backend is running on http://localhost:5000
- Verify the `.env` file in frontend has correct API URL
- Try accessing http://localhost:5000/health directly

### 7. "Module not found" errors
**Problem**: Dependencies not installed properly
**Solution**:
```bash
# Reinstall all dependencies
rm -rf node_modules package-lock.json  # In both backend and frontend
npm install
```

### 8. Login doesn't work
**Problem**: Database might not have test users
**Solution**:
```bash
# Check if backend is running and MongoDB is connected
curl http://localhost:5000/health

# Test API login directly
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin", "password": "admin123"}'
```

### 9. "Cannot read property of undefined" errors
**Problem**: React app might have build issues
**Solution**:
```bash
cd frontend
rm -rf node_modules build
npm install
npm start
```

### 10. MongoDB won't start
**Problem**: MongoDB service issues
**Solutions**:

#### Check if MongoDB is already running:
```bash
ps aux | grep mongod
```

#### Kill existing MongoDB processes:
```bash
sudo pkill mongod
```

#### Start fresh:
```bash
mongod --dbpath /data/db --logpath /tmp/mongodb.log
```

## Quick Reset Everything

If nothing works, try this complete reset:

```bash
# Stop everything
./stop.sh

# Kill all related processes
sudo pkill mongod
sudo lsof -ti:3000 | xargs kill -9
sudo lsof -ti:5000 | xargs kill -9

# Reset MongoDB
sudo rm -rf /data/db
sudo mkdir -p /data/db
sudo chown -R $USER:$USER /data/db

# Reinstall dependencies
cd backend && rm -rf node_modules && npm install
cd ../frontend && rm -rf node_modules && npm install

# Start fresh
cd .. && ./start.sh
```

## Getting Help

### Check System Status:
```bash
# Check Node.js
node --version
npm --version

# Check MongoDB
mongod --version
ps aux | grep mongod

# Check ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :5000

# Check logs
tail -f /tmp/mongodb.log
```

### Environment Verification:
```bash
# Check environment files exist
ls -la backend/.env
ls -la frontend/.env

# Verify backend environment
cd backend && cat .env

# Verify frontend environment  
cd frontend && cat .env
```

### Test Individual Components:
```bash
# Test MongoDB connection
mongo --eval "db.runCommand({connectionStatus : 1})"

# Test backend only
cd backend && npm start

# Test frontend only (in new terminal)
cd frontend && npm start
```

## Still Need Help?

1. **Check the logs**: Look at terminal output for specific error messages
2. **Restart everything**: Sometimes a fresh start fixes issues
3. **Check firewalls**: Make sure ports 3000 and 5000 are not blocked
4. **Update dependencies**: Run `npm update` in both backend and frontend folders
5. **Try different ports**: Edit .env files to use different ports if needed

Remember: Most issues are related to:
- Missing Node.js/MongoDB installation
- Ports being used by other applications
- Missing or incorrect environment files
- Permission issues with MongoDB data directory
