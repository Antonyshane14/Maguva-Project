#!/bin/bash

# Boutique Management System - Automated Setup Script
# This script sets up the entire application automatically

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_status "🏪 Boutique Management System Setup"
print_status "=================================="

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js v16+ from https://nodejs.org/"
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

if ! command_exists git; then
    print_error "Git is not installed. Please install Git from https://git-scm.com/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version must be 16 or higher. Current version: $(node --version)"
    exit 1
fi

print_success "All prerequisites are installed!"

# Check if MongoDB is available
print_status "Checking MongoDB..."
if command_exists mongod; then
    print_success "MongoDB is installed"
else
    print_warning "MongoDB not found. Installing MongoDB..."
    
    # Detect OS and install MongoDB
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command_exists apt; then
            sudo apt update
            sudo apt install -y mongodb-server-core
        elif command_exists yum; then
            sudo yum install -y mongodb-server
        else
            print_error "Please install MongoDB manually from https://www.mongodb.com/try/download/community"
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # Mac OSX
        if command_exists brew; then
            brew tap mongodb/brew
            brew install mongodb-community
        else
            print_error "Please install Homebrew first, then run: brew install mongodb-community"
            exit 1
        fi
    else
        print_error "Please install MongoDB manually from https://www.mongodb.com/try/download/community"
        exit 1
    fi
fi

# Create MongoDB data directory
print_status "Setting up MongoDB data directory..."
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    mkdir -p /c/data/db
else
    # Unix-like systems
    sudo mkdir -p /data/db
    sudo chown -R $USER:$USER /data/db 2>/dev/null || true
fi

# Start MongoDB
print_status "Starting MongoDB..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if command_exists systemctl; then
        sudo systemctl start mongod 2>/dev/null || mongod --dbpath /data/db --fork --logpath /tmp/mongodb.log
    else
        mongod --dbpath /data/db --fork --logpath /tmp/mongodb.log
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    if command_exists brew; then
        brew services start mongodb-community 2>/dev/null || mongod --dbpath /data/db --fork --logpath /tmp/mongodb.log
    else
        mongod --dbpath /data/db --fork --logpath /tmp/mongodb.log
    fi
else
    mongod --dbpath /data/db --fork --logpath /tmp/mongodb.log
fi

sleep 3  # Wait for MongoDB to start

# Setup Backend
print_status "Setting up backend..."
cd backend

print_status "Installing backend dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating backend .env file..."
    cat > .env << EOF
PORT=5000
MONGODB_URI=mongodb://localhost:27017/boutique
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRE=24h
NODE_ENV=development
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
    print_success "Backend .env file created"
fi

# Setup Frontend
print_status "Setting up frontend..."
cd ../frontend

print_status "Installing frontend dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating frontend .env file..."
    cat > .env << EOF
REACT_APP_API_URL=http://localhost:5000/api
GENERATE_SOURCEMAP=false
EOF
    print_success "Frontend .env file created"
fi

cd ..

# Create start script
print_status "Creating start script..."
cat > start.sh << 'EOF'
#!/bin/bash

# Start script for Boutique Management System

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🏪 Starting Boutique Management System...${NC}"

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo -e "${BLUE}Starting MongoDB...${NC}"
    mongod --dbpath /data/db --fork --logpath /tmp/mongodb.log
    sleep 3
fi

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
echo -e "${GREEN}Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}Backend: http://localhost:5000${NC}"
echo -e "${GREEN}Health Check: http://localhost:5000/health${NC}"
echo ""
echo -e "${BLUE}Test Credentials:${NC}"
echo "Admin: admin / admin123"
echo "Manager: manager1 / manager123"
echo "Staff: staff1 / staff123"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for user to stop
wait $FRONTEND_PID $BACKEND_PID
EOF

chmod +x start.sh

# Create stop script
print_status "Creating stop script..."
cat > stop.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping Boutique Management System..."

# Kill Node.js processes on ports 3000 and 5000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5000 | xargs kill -9 2>/dev/null || true

# Kill any remaining node processes related to the project
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true

echo "✅ All servers stopped"
EOF

chmod +x stop.sh

# Test backend setup
print_status "Testing backend setup..."
cd backend
timeout 10s npm start &
BACKEND_PID=$!
sleep 5

# Test if backend is responding
if curl -s http://localhost:5000/health > /dev/null; then
    print_success "Backend is working!"
else
    print_warning "Backend might not be fully ready yet"
fi

# Stop test backend
kill $BACKEND_PID 2>/dev/null || true

cd ..

print_success "🎉 Setup completed successfully!"
print_status ""
print_status "Next steps:"
print_status "1. Run: ./start.sh"
print_status "2. Open browser to: http://localhost:3000"
print_status "3. Login with: admin / admin123"
print_status ""
print_status "To stop the application: ./stop.sh"
print_status ""
print_status "Enjoy your Boutique Management System! 🏪"
