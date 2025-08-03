const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  customer: {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    // Guest customer details if no customer account
    guestInfo: {
      name: String,
      phone: String,
      email: String,
      address: String
    }
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    variantId: {
      type: String,
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    variantDetails: {
      size: String,
      color: String,
      sku: String
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    pricing: {
      unitPrice: {
        type: Number,
        required: true,
        min: 0
      },
      discount: {
        type: Number,
        default: 0,
        min: 0
      },
      discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage'
      },
      finalPrice: {
        type: Number,
        required: true,
        min: 0
      },
      gstRate: {
        type: Number,
        required: true,
        default: 5
      },
      gstAmount: {
        type: Number,
        required: true,
        default: 0
      }
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totals: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalGst: {
      type: Number,
      required: true,
      min: 0
    },
    cgst: {
      type: Number,
      default: 0,
      min: 0
    },
    sgst: {
      type: Number,
      default: 0,
      min: 0
    },
    igst: {
      type: Number,
      default: 0,
      min: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0
    },
    roundOffAmount: {
      type: Number,
      default: 0
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0
    }
  },
  payment: {
    methods: [{
      method: {
        type: String,
        enum: ['cash', 'card', 'upi', 'netbanking', 'wallet', 'emi'],
        required: true
      },
      amount: {
        type: Number,
        required: true,
        min: 0
      },
      transactionId: String,
      reference: String,
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'completed'
      }
    }],
    totalPaid: {
      type: Number,
      required: true,
      min: 0
    },
    balanceAmount: {
      type: Number,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'completed', 'overpaid', 'refunded'],
      default: 'pending'
    }
  },
  offers: {
    appliedOffers: [{
      offerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer'
      },
      offerName: String,
      discountAmount: Number,
      offerType: String
    }],
    loyaltyPointsUsed: {
      type: Number,
      default: 0
    },
    loyaltyPointsEarned: {
      type: Number,
      default: 0
    }
  },
  delivery: {
    type: {
      type: String,
      enum: ['pickup', 'delivery'],
      default: 'pickup'
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: String
    },
    estimatedDate: Date,
    actualDate: Date,
    charges: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'packed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    }
  },
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'processing', 'ready', 'completed', 'cancelled', 'returned'],
    default: 'confirmed'
  },
  notes: {
    customerNotes: String,
    internalNotes: String
  },
  metadata: {
    source: {
      type: String,
      enum: ['pos', 'online', 'phone', 'whatsapp'],
      default: 'pos'
    },
    salesPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    returnPolicy: {
      isReturnable: { type: Boolean, default: true },
      returnDays: { type: Number, default: 7 },
      returnReason: String,
      returnDate: Date
    }
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
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ invoiceNumber: 1 });
orderSchema.index({ 'customer.customerId': 1 });
orderSchema.index({ storeId: 1, createdAt: -1 });
orderSchema.index({ status: 1, storeId: 1 });
orderSchema.index({ 'payment.paymentStatus': 1, storeId: 1 });
orderSchema.index({ createdAt: -1, storeId: 1 });

// Pre-save middleware to generate order and invoice numbers
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    if (!this.orderNumber) {
      const count = await this.constructor.countDocuments({ storeId: this.storeId });
      this.orderNumber = `ORD${String(count + 1).padStart(6, '0')}`;
    }
    
    if (!this.invoiceNumber) {
      const today = new Date();
      const year = today.getFullYear().toString().slice(-2);
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const invoiceCount = await this.constructor.countDocuments({
        storeId: this.storeId,
        createdAt: {
          $gte: new Date(today.getFullYear(), today.getMonth(), 1),
          $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
        }
      });
      this.invoiceNumber = `INV${year}${month}${String(invoiceCount + 1).padStart(4, '0')}`;
    }
  }
  next();
});

// Pre-save middleware to calculate totals
orderSchema.pre('save', function(next) {
  // Calculate item totals
  this.items.forEach(item => {
    let discountAmount = 0;
    if (item.pricing.discountType === 'percentage') {
      discountAmount = (item.pricing.unitPrice * item.pricing.discount) / 100;
    } else {
      discountAmount = item.pricing.discount;
    }
    
    item.pricing.finalPrice = item.pricing.unitPrice - discountAmount;
    item.pricing.gstAmount = (item.pricing.finalPrice * item.pricing.gstRate) / 100;
    item.totalAmount = (item.pricing.finalPrice + item.pricing.gstAmount) * item.quantity;
  });

  // Calculate order totals
  this.totals.subtotal = this.items.reduce((sum, item) => 
    sum + (item.pricing.finalPrice * item.quantity), 0);
  
  this.totals.totalDiscount = this.items.reduce((sum, item) => {
    let discount = 0;
    if (item.pricing.discountType === 'percentage') {
      discount = (item.pricing.unitPrice * item.pricing.discount) / 100;
    } else {
      discount = item.pricing.discount;
    }
    return sum + (discount * item.quantity);
  }, 0);
  
  this.totals.totalGst = this.items.reduce((sum, item) => 
    sum + (item.pricing.gstAmount * item.quantity), 0);
  
  // Split GST based on delivery address (assuming intra-state for now)
  this.totals.cgst = this.totals.totalGst / 2;
  this.totals.sgst = this.totals.totalGst / 2;
  this.totals.igst = 0;
  
  this.totals.grandTotal = this.totals.subtotal + this.totals.totalGst;
  
  // Round off to nearest rupee
  this.totals.roundOffAmount = Math.round(this.totals.grandTotal) - this.totals.grandTotal;
  this.totals.finalAmount = Math.round(this.totals.grandTotal);
  
  // Update payment status
  this.payment.balanceAmount = this.totals.finalAmount - this.payment.totalPaid;
  
  if (this.payment.totalPaid === 0) {
    this.payment.paymentStatus = 'pending';
  } else if (this.payment.totalPaid < this.totals.finalAmount) {
    this.payment.paymentStatus = 'partial';
  } else if (this.payment.totalPaid === this.totals.finalAmount) {
    this.payment.paymentStatus = 'completed';
  } else {
    this.payment.paymentStatus = 'overpaid';
  }
  
  next();
});

// Virtual for order age in days
orderSchema.virtual('orderAge').get(function() {
  const today = new Date();
  const orderDate = new Date(this.createdAt);
  const diffTime = Math.abs(today - orderDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Order', orderSchema);
