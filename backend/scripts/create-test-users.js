require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

console.log('Script starting...');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/maguva_boutique';

const testUsers = [
  {
    username: 'admin',
    email: 'admin@boutique.com',
    password: 'admin123',
    role: 'admin',
    profile: {
      firstName: 'Admin',
      lastName: 'User',
      phone: '+91-9876543210'
    },
    isActive: true
  },
  {
    username: 'manager1',
    email: 'manager1@boutique.com',
    password: 'manager123',
    role: 'manager',
    profile: {
      firstName: 'Priya',
      lastName: 'Sharma',
      phone: '+91-9876543211'
    },
    isActive: true
  },
  {
    username: 'staff1',
    email: 'staff1@boutique.com',
    password: 'staff123',
    role: 'staff',
    profile: {
      firstName: 'Ravi',
      lastName: 'Kumar',
      phone: '+91-9876543212'
    },
    isActive: true
  }
];

async function createTestUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users first
    console.log('🧹 Clearing existing users...');
    await User.deleteMany({});
    console.log('✅ Existing users cleared');

    console.log('👥 Creating test users...');
    
    for (const userData of testUsers) {
      try {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Created user: ${userData.username} (${userData.role})`);
      } catch (error) {
        console.error(`❌ Failed to create user ${userData.username}:`, error.message);
      }
    }

    console.log('\n🎉 Test users created successfully!');
    console.log('\n🔑 Login Credentials:');
    console.log('👑 Admin: admin / admin123');
    console.log('🎯 Manager: manager1 / manager123');
    console.log('👤 Staff: staff1 / staff123');
    console.log('\n💡 You can login with either username or email');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
createTestUsers();
