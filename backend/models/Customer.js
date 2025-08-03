const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerNumber: {
    type: String,
    unique: true,
    required: true
  },
  personalInfo: {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    alternatePhone: {
      type: String,
      trim: true
    },
    dateOfBirth: {
      type: Date
    },
    anniversary: {
      type: Date
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Prefer not to say']
    }
  },
  address: {
    billing: {
      street: String,
      landmark: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' }
    },
    shipping: {
      street: String,
      landmark: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
      sameAsBilling: { type: Boolean, default: true }
    }
  },
  preferences: {
    preferredSizes: [{
      type: String,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size']
    }],
    preferredColors: [String],
    preferredCategories: [{
      productType: String,
      fabricType: String
    }],
    communicationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
      promotionalMessages: { type: Boolean, default: true }
    }
  },
  loyaltyProgram: {
    isEnrolled: {
      type: Boolean,
      default: false
    },
    points: {
      type: Number,
      default: 0,
      min: 0
    },
    tier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      default: 'Bronze'
    },
    membershipDate: Date,
    pointsHistory: [{
      date: { type: Date, default: Date.now },
      points: Number,
      type: { type: String, enum: ['earned', 'redeemed', 'expired'] },
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
      description: String
    }]
  },
  purchaseHistory: {
    totalOrders: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0
    },
    lastPurchaseDate: Date,
    firstPurchaseDate: Date,
    favoriteCategories: [{
      category: String,
      purchaseCount: Number
    }]
  },
  gstInfo: {
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: true
    },
    businessName: {
      type: String,
      trim: true
    },
    businessType: {
      type: String,
      enum: ['Individual', 'Sole Proprietorship', 'Partnership', 'Private Limited', 'Public Limited', 'LLP']
    }
  },
  tags: [String],
  notes: [{
    note: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
customerSchema.index({ customerNumber: 1, storeId: 1 });
customerSchema.index({ 'personalInfo.phone': 1, storeId: 1 });
customerSchema.index({ 'personalInfo.email': 1, storeId: 1 });
customerSchema.index({ 'personalInfo.firstName': 'text', 'personalInfo.lastName': 'text' });
customerSchema.index({ storeId: 1, isActive: 1 });
customerSchema.index({ 'gstInfo.gstNumber': 1 });

// Pre-save middleware to generate customer number
customerSchema.pre('save', async function(next) {
  if (this.isNew && !this.customerNumber) {
    const count = await this.constructor.countDocuments({ storeId: this.storeId });
    this.customerNumber = `CUST${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Pre-save middleware to update customer statistics
customerSchema.pre('save', function(next) {
  if (this.purchaseHistory.totalOrders > 0) {
    this.purchaseHistory.averageOrderValue = 
      this.purchaseHistory.totalSpent / this.purchaseHistory.totalOrders;
  }
  next();
});

// Virtual for full name
customerSchema.virtual('fullName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName || ''}`.trim();
});

// Virtual for customer age
customerSchema.virtual('age').get(function() {
  if (!this.personalInfo.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.personalInfo.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Method to check if customer has birthday this month
customerSchema.methods.hasBirthdayThisMonth = function() {
  if (!this.personalInfo.dateOfBirth) return false;
  const today = new Date();
  const birthDate = new Date(this.personalInfo.dateOfBirth);
  return today.getMonth() === birthDate.getMonth();
};

// Method to check if customer has anniversary this month
customerSchema.methods.hasAnniversaryThisMonth = function() {
  if (!this.personalInfo.anniversary) return false;
  const today = new Date();
  const anniversaryDate = new Date(this.personalInfo.anniversary);
  return today.getMonth() === anniversaryDate.getMonth();
};

module.exports = mongoose.model('Customer', customerSchema);
