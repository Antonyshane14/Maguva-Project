#!/bin/bash

# Start script for Boutique Management System

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🏪 Starting Boutique Management System...${NC}"

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo -e "${BLUE}Starting MongoDB...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start mongod 2>/dev/null || mongod --dbpath /data/db --fork --logpath /tmp/mongodb.log
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start mongodb-community 2>/dev/null || mongod --dbpath /data/db --fork --logpath /tmp/mongodb.log
    else
        mongod --dbpath /data/db --fork --logpath /tmp/mongodb.log
    fi
    sleep 3
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${RED}Stopping servers...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup SIGINT SIGTERM

# Start backend in background
echo -e "${BLUE}Starting backend server...${NC}"
cd backend
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 5

# Start frontend
echo -e "${BLUE}Starting frontend server...${NC}"
cd ../frontend
npm start &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 5

echo -e "${GREEN}✅ Application started successfully!${NC}"
echo -e "${GREEN}🌐 Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}🔧 Backend: http://localhost:5000${NC}"
echo -e "${GREEN}❤️  Health Check: http://localhost:5000/health${NC}"
echo ""
echo -e "${BLUE}🔑 Test Credentials:${NC}"
echo "👑 Admin: admin / admin123"
echo "🎯 Manager: manager1 / manager123"  
echo "👤 Staff: staff1 / staff123"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop all servers${NC}"

# Wait for user to stop
wait $FRONTEND_PID $BACKEND_PID
