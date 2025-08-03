# Boutique Management System - Test Credentials

## 🔐 Test User Accounts

### Admin User
- **Username**: `admin`
- **Email**: `admin@boutique.com`
- **Password**: `admin123`
- **Role**: `admin`
- **Full Access**: Yes

### Manager User
- **Username**: `manager1`
- **Email**: `manager@boutique.com`
- **Password**: `manager123`
- **Role**: `manager`
- **Access**: Product management, customer management, inventory

### Staff User
- **Username**: `staff1`
- **Email**: `staff@boutique.com`
- **Password**: `staff123`
- **Role**: `staff`
- **Access**: POS operations, basic customer management

## 🧪 How to Test

### Via Frontend (React App)
1. Go to: http://localhost:3000
2. Click "Sign In" if not already on login page
3. Use any of the credentials above
4. **Important**: In the login form, you can use either:
   - Email: `admin@boutique.com`
   - Username: `admin`

### Via API (Direct Testing)
```bash
# Login with email
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@boutique.com",
    "password": "admin123"
  }'

# Login with username
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin",
    "password": "admin123"
  }'
```

## 🌐 Application URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/health

## 📝 Notes
- MongoDB is running locally
- Both frontend and backend servers are active
- All user data is stored in local MongoDB database
- Passwords are securely hashed with bcrypt
- JWT tokens are used for authentication
- You can register new users via the frontend registration page
