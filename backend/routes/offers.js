const express = require('express');
const mongoose = require('mongoose');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

// Offer Schema (inline for this route file)
const offerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  type: {
    type: String,
    enum: ['percentage', 'fixed_amount', 'buy_x_get_y', 'bundle'],
    required: true
  },
  value: {
    percentage: Number, // For percentage discounts
    amount: Number,     // For fixed amount discounts
    buyQuantity: Number, // For buy X get Y offers
    getQuantity: Number,
    bundlePrice: Number  // For bundle offers
  },
  conditions: {
    minOrderValue: Number,
    maxDiscount: Number,
    applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    applicableCategories: [String],
    customerTiers: [String], // bronze, silver, gold, platinum
    newCustomersOnly: { type: Boolean, default: false },
    usageLimit: Number,
    perCustomerLimit: Number
  },
  validity: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    validDays: [String], // monday, tuesday, etc.
    validHours: {
      start: String, // "09:00"
      end: String    // "18:00"
    }
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  isActive: { type: Boolean, default: true },
  usageCount: { type: Number, default: 0 },
  code: {
    type: String,
    unique: true,
    sparse: true // Allow null values
  },
  autoApply: { type: Boolean, default: false }, // Auto-apply if conditions met
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

// Add indexes
offerSchema.index({ store: 1, isActive: 1 });
offerSchema.index({ 'validity.startDate': 1, 'validity.endDate': 1 });
offerSchema.index({ code: 1 }, { unique: true, sparse: true });

const Offer = mongoose.models.Offer || mongoose.model('Offer', offerSchema);

// @route   GET /api/offers
// @desc    Get all offers with pagination and filters
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { code: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    const offers = await Offer.find(filter)
      .populate('store', 'name location')
      .populate('conditions.applicableProducts', 'name')
      .populate('createdBy', 'username profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Offer.countDocuments(filter);

    res.json({
      offers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/offers/:id
// @desc    Get single offer
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('store', 'name location')
      .populate('conditions.applicableProducts', 'name category')
      .populate('createdBy', 'username profile.firstName profile.lastName')
      .populate('updatedBy', 'username profile.firstName profile.lastName');

    if (!offer) {
      return res.status(404).json({
        message: 'Offer not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(offer.store._id.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    res.json(offer);
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/offers
// @desc    Create new offer
// @access  Private (Manager/Admin)
router.post('/', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const offerData = req.body;
    
    // Set store from user's primary store if not provided
    if (!offerData.store && req.user.storeAccess?.length > 0) {
      offerData.store = req.user.storeAccess[0];
    }

    // Generate unique code if not provided
    if (!offerData.code && offerData.type !== 'auto_apply') {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substr(2, 5).toUpperCase();
      offerData.code = `OFFER${timestamp}${random}`;
    }

    const offer = new Offer({
      ...offerData,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await offer.save();
    await offer.populate([
      { path: 'store', select: 'name location' },
      { path: 'conditions.applicableProducts', select: 'name' }
    ]);

    res.status(201).json({
      message: 'Offer created successfully',
      offer
    });
  } catch (error) {
    console.error('Create offer error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Offer code already exists'
      });
    }
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/offers/:id
// @desc    Update offer
// @access  Private (Manager/Admin)
router.put('/:id', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        message: 'Offer not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(offer.store.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    // Update offer
    Object.assign(offer, req.body);
    offer.updatedBy = req.user._id;
    offer.updatedAt = new Date();

    await offer.save();
    await offer.populate([
      { path: 'store', select: 'name location' },
      { path: 'conditions.applicableProducts', select: 'name' }
    ]);

    res.json({
      message: 'Offer updated successfully',
      offer
    });
  } catch (error) {
    console.error('Update offer error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/offers/:id
// @desc    Delete offer
// @access  Private (Admin only)
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);

    if (!offer) {
      return res.status(404).json({
        message: 'Offer not found'
      });
    }

    res.json({
      message: 'Offer deleted successfully'
    });
  } catch (error) {
    console.error('Delete offer error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/offers/validate
// @desc    Validate offer code and return applicable discounts
// @access  Private
router.post('/validate', auth, async (req, res) => {
  try {
    const { code, customerId, items, orderTotal, storeId } = req.body;

    if (!code) {
      return res.status(400).json({
        message: 'Offer code is required'
      });
    }

    // Find offer by code
    const offer = await Offer.findOne({
      code,
      isActive: true,
      store: storeId || { $in: req.user.storeAccess }
    }).populate('conditions.applicableProducts');

    if (!offer) {
      return res.status(404).json({
        message: 'Invalid or expired offer code'
      });
    }

    // Check validity dates
    const now = new Date();
    if (now < offer.validity.startDate || now > offer.validity.endDate) {
      return res.status(400).json({
        message: 'Offer has expired or not yet active'
      });
    }

    // Check day of week
    if (offer.validity.validDays?.length > 0) {
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
      if (!offer.validity.validDays.includes(dayOfWeek)) {
        return res.status(400).json({
          message: 'Offer not valid on this day'
        });
      }
    }

    // Check time of day
    if (offer.validity.validHours?.start && offer.validity.validHours?.end) {
      const currentTime = now.toTimeString().slice(0, 5);
      if (currentTime < offer.validity.validHours.start || currentTime > offer.validity.validHours.end) {
        return res.status(400).json({
          message: 'Offer not valid at this time'
        });
      }
    }

    // Check usage limits
    if (offer.conditions.usageLimit && offer.usageCount >= offer.conditions.usageLimit) {
      return res.status(400).json({
        message: 'Offer usage limit exceeded'
      });
    }

    // Check minimum order value
    if (offer.conditions.minOrderValue && orderTotal < offer.conditions.minOrderValue) {
      return res.status(400).json({
        message: `Minimum order value of ₹${offer.conditions.minOrderValue} required`
      });
    }

    // Check customer eligibility (if customer is provided)
    if (customerId && offer.conditions.customerTiers?.length > 0) {
      const Customer = require('../models/Customer');
      const customer = await Customer.findById(customerId);
      if (customer && !offer.conditions.customerTiers.includes(customer.loyalty.tier)) {
        return res.status(400).json({
          message: 'You are not eligible for this offer'
        });
      }
    }

    // Calculate discount
    let discount = 0;
    let applicableItems = [];

    // Check product/category applicability
    const isProductApplicable = (item) => {
      if (offer.conditions.applicableProducts?.length > 0) {
        return offer.conditions.applicableProducts.some(p => p._id.toString() === item.product);
      }
      if (offer.conditions.applicableCategories?.length > 0) {
        // Would need to populate product category here
        return offer.conditions.applicableCategories.includes(item.category);
      }
      return true; // Apply to all products if no restrictions
    };

    if (items && items.length > 0) {
      applicableItems = items.filter(isProductApplicable);
    }

    const applicableTotal = applicableItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    switch (offer.type) {
      case 'percentage':
        discount = (applicableTotal * offer.value.percentage) / 100;
        if (offer.conditions.maxDiscount) {
          discount = Math.min(discount, offer.conditions.maxDiscount);
        }
        break;
      
      case 'fixed_amount':
        discount = Math.min(offer.value.amount, applicableTotal);
        break;
      
      case 'buy_x_get_y':
        // Calculate discount for buy X get Y offers
        const totalQuantity = applicableItems.reduce((sum, item) => sum + item.quantity, 0);
        const freeItems = Math.floor(totalQuantity / offer.value.buyQuantity) * offer.value.getQuantity;
        if (freeItems > 0 && applicableItems.length > 0) {
          // Apply discount equal to the price of cheapest items
          const sortedItems = applicableItems.sort((a, b) => a.price - b.price);
          let remainingFreeItems = freeItems;
          
          for (const item of sortedItems) {
            const freeFromThisItem = Math.min(remainingFreeItems, item.quantity);
            discount += freeFromThisItem * item.price;
            remainingFreeItems -= freeFromThisItem;
            if (remainingFreeItems <= 0) break;
          }
        }
        break;
      
      case 'bundle':
        if (applicableItems.length >= 2) {
          discount = applicableTotal - offer.value.bundlePrice;
          discount = Math.max(0, discount);
        }
        break;
    }

    res.json({
      valid: true,
      offer: {
        _id: offer._id,
        name: offer.name,
        description: offer.description,
        type: offer.type,
        code: offer.code
      },
      discount: Math.round(discount * 100) / 100,
      applicableItems: applicableItems.length,
      message: `Discount of ₹${Math.round(discount * 100) / 100} applied`
    });
  } catch (error) {
    console.error('Validate offer error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/offers/applicable
// @desc    Get auto-applicable offers for an order
// @access  Private
router.get('/applicable', auth, async (req, res) => {
  try {
    const { customerId, orderTotal, storeId } = req.query;

    const filter = {
      isActive: true,
      autoApply: true,
      'validity.startDate': { $lte: new Date() },
      'validity.endDate': { $gte: new Date() },
      store: storeId || { $in: req.user.storeAccess }
    };

    // Check minimum order value
    if (orderTotal) {
      filter.$or = [
        { 'conditions.minOrderValue': { $lte: parseFloat(orderTotal) } },
        { 'conditions.minOrderValue': { $exists: false } }
      ];
    }

    const offers = await Offer.find(filter)
      .populate('conditions.applicableProducts', 'name')
      .sort({ value: -1 }); // Sort by value descending to apply best offers first

    const applicableOffers = [];

    for (const offer of offers) {
      // Check customer tier eligibility
      if (customerId && offer.conditions.customerTiers?.length > 0) {
        const Customer = require('../models/Customer');
        const customer = await Customer.findById(customerId);
        if (customer && !offer.conditions.customerTiers.includes(customer.loyalty.tier)) {
          continue;
        }
      }

      // Check usage limits
      if (offer.conditions.usageLimit && offer.usageCount >= offer.conditions.usageLimit) {
        continue;
      }

      // Check day and time validity
      const now = new Date();
      if (offer.validity.validDays?.length > 0) {
        const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
        if (!offer.validity.validDays.includes(dayOfWeek)) {
          continue;
        }
      }

      if (offer.validity.validHours?.start && offer.validity.validHours?.end) {
        const currentTime = now.toTimeString().slice(0, 5);
        if (currentTime < offer.validity.validHours.start || currentTime > offer.validity.validHours.end) {
          continue;
        }
      }

      applicableOffers.push({
        _id: offer._id,
        name: offer.name,
        description: offer.description,
        type: offer.type,
        value: offer.value,
        conditions: offer.conditions,
        autoApply: offer.autoApply
      });
    }

    res.json({
      offers: applicableOffers,
      count: applicableOffers.length
    });
  } catch (error) {
    console.error('Get applicable offers error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/offers/:id/toggle
// @desc    Toggle offer active status
// @access  Private (Manager/Admin)
router.put('/:id/toggle', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        message: 'Offer not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(offer.store.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    offer.isActive = !offer.isActive;
    offer.updatedBy = req.user._id;
    offer.updatedAt = new Date();

    await offer.save();

    res.json({
      message: `Offer ${offer.isActive ? 'activated' : 'deactivated'} successfully`,
      offer: {
        _id: offer._id,
        name: offer.name,
        isActive: offer.isActive
      }
    });
  } catch (error) {
    console.error('Toggle offer error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
