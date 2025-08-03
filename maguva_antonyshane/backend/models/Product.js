const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  qrCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  category: {
    productType: {
      type: String,
      required: true,
      enum: ['Kurti', 'Saree', 'Lehenga', 'Dress', 'Top', 'Bottom', 'Dupatta', 'Accessories', 'Other']
    },
    fabricType: {
      type: String,
      required: true,
      enum: ['Cotton', 'Linen', 'Silk', 'Chiffon', 'Georgette', 'Crepe', 'Polyester', 'Rayon', 'Mixed', 'Other']
    },
    subCategory: {
      type: String,
      trim: true
    }
  },
  variants: [{
    size: {
      type: String,
      required: true,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size', 'Custom']
    },
    color: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    pricing: {
      costPrice: {
        type: Number,
        required: true,
        min: 0
      },
      sellingPrice: {
        type: Number,
        required: true,
        min: 0
      },
      mrp: {
        type: Number,
        required: true,
        min: 0
      },
      discountPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    },
    stock: {
      quantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0
      },
      reservedQuantity: {
        type: Number,
        default: 0,
        min: 0
      },
      minStockLevel: {
        type: Number,
        default: 5,
        min: 0
      },
      maxStockLevel: {
        type: Number,
        default: 100,
        min: 0
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  vendor: {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor'
    },
    vendorName: {
      type: String,
      trim: true
    },
    purchaseInfo: {
      lastPurchaseDate: Date,
      lastPurchasePrice: Number,
      averagePurchasePrice: Number
    }
  },
  gst: {
    gstRate: {
      type: Number,
      required: true,
      default: 5,
      enum: [0, 5, 12, 18, 28]
    },
    hsnCode: {
      type: String,
      trim: true
    },
    taxCategory: {
      type: String,
      default: 'Taxable'
    }
  },
  images: [{
    url: String,
    alt: String,
    isPrimary: { type: Boolean, default: false }
  }],
  measurements: {
    length: Number,
    width: Number,
    height: Number,
    weight: Number,
    unit: {
      type: String,
      enum: ['cm', 'inch', 'gram', 'kg'],
      default: 'cm'
    }
  },
  tags: [String],
  seasonality: {
    type: String,
    enum: ['Spring', 'Summer', 'Monsoon', 'Winter', 'All Season']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ 'category.productType': 1, 'category.fabricType': 1 });
productSchema.index({ sku: 1, storeId: 1 });
productSchema.index({ barcode: 1, storeId: 1 });
productSchema.index({ 'variants.sku': 1 });
productSchema.index({ 'variants.barcode': 1 });
productSchema.index({ storeId: 1, isActive: 1 });

// Virtual for total stock across all variants
productSchema.virtual('totalStock').get(function() {
  return this.variants.reduce((total, variant) => total + variant.stock.quantity, 0);
});

// Virtual for available stock (total - reserved)
productSchema.virtual('availableStock').get(function() {
  return this.variants.reduce((total, variant) => 
    total + (variant.stock.quantity - variant.stock.reservedQuantity), 0);
});

// Pre-save middleware to validate variant SKUs
productSchema.pre('save', function(next) {
  const skus = this.variants.map(v => v.sku);
  const uniqueSkus = [...new Set(skus)];
  
  if (skus.length !== uniqueSkus.length) {
    return next(new Error('Variant SKUs must be unique within a product'));
  }
  
  next();
});

module.exports = mongoose.model('Product', productSchema);
