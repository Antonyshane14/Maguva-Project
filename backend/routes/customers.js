const express = require('express');
const Customer = require('../models/Customer');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/customers/reports/analytics
// @desc    Get customer analytics
// @access  Private (Manager/Admin)
router.get('/reports/analytics', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const filter = { isActive: true };

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    // Get basic customer statistics
    const totalCustomers = await Customer.countDocuments(filter);
    
    const customerTypes = await Customer.aggregate([
      { $match: filter },
      { $group: { _id: '$customerType', count: { $sum: 1 } } }
    ]);

    const loyaltyTiers = await Customer.aggregate([
      { $match: filter },
      { $group: { _id: '$loyalty.tier', count: { $sum: 1 } } }
    ]);

    // Top customers by purchase value
    const topCustomers = await Customer.find(filter)
      .sort({ 'purchaseHistory.totalSpent': -1 })
      .limit(10)
      .select('name email purchaseHistory.totalSpent purchaseHistory.orderCount loyalty.tier');

    // New customers this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const newCustomersThisMonth = await Customer.countDocuments({
      ...filter,
      createdAt: { $gte: thisMonth }
    });

    // Customers with birthdays this month
    const birthdayCustomers = await Customer.find({
      ...filter,
      'personalInfo.birthday': {
        $regex: `^\\d{4}-${String(thisMonth.getMonth() + 1).padStart(2, '0')}`
      }
    }).select('name email personalInfo.birthday phone');

    res.json({
      summary: {
        totalCustomers,
        newCustomersThisMonth,
        birthdayCustomers: birthdayCustomers.length
      },
      customerTypes,
      loyaltyTiers,
      topCustomers,
      birthdayCustomers
    });
  } catch (error) {
    console.error('Get customer analytics error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/customers/search/quick
// @desc    Quick customer search for POS
// @access  Private
router.get('/search/quick', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ customers: [] });
    }

    const filter = {
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { customerCode: { $regex: q, $options: 'i' } }
      ]
    };

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    const customers = await Customer.find(filter)
      .select('name email phone customerCode loyalty.points loyalty.tier')
      .limit(10)
      .sort({ name: 1 });

    res.json({ customers });
  } catch (error) {
    console.error('Quick search error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/customers
// @desc    Get all customers with pagination and filters
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = { isActive: true };
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
        { customerCode: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    if (req.query.customerType) {
      filter.customerType = req.query.customerType;
    }
    
    if (req.query.loyaltyTier) {
      filter['loyalty.tier'] = req.query.loyaltyTier;
    }

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    const customers = await Customer.find(filter)
      .populate('store', 'name location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Customer.countDocuments(filter);

    res.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/customers/:id
// @desc    Get single customer
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('store', 'name location')
      .populate('purchaseHistory.orders');

    if (!customer) {
      return res.status(404).json({
        message: 'Customer not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(customer.store._id.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    res.json(customer);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/customers
// @desc    Create new customer
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const customerData = req.body;
    
    // Set store from user's primary store if not provided
    if (!customerData.store && req.user.storeAccess?.length > 0) {
      customerData.store = req.user.storeAccess[0];
    }

    // Check if customer already exists with same email or phone
    const existingCustomer = await Customer.findOne({
      $or: [
        { email: customerData.email },
        { phone: customerData.phone }
      ],
      isActive: true
    });

    if (existingCustomer) {
      return res.status(400).json({
        message: 'Customer already exists with this email or phone'
      });
    }

    const customer = new Customer({
      ...customerData,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await customer.save();
    await customer.populate('store', 'name location');

    res.status(201).json({
      message: 'Customer created successfully',
      customer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Customer with this email or phone already exists'
      });
    }
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/customers/:id
// @desc    Update customer
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: 'Customer not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(customer.store.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    // Update customer
    Object.assign(customer, req.body);
    customer.updatedBy = req.user._id;
    customer.updatedAt = new Date();

    await customer.save();
    await customer.populate('store', 'name location');

    res.json({
      message: 'Customer updated successfully',
      customer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/customers/:id
// @desc    Delete customer (soft delete)
// @access  Private (Manager/Admin)
router.delete('/:id', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: 'Customer not found'
      });
    }

    customer.isActive = false;
    customer.updatedBy = req.user._id;
    customer.updatedAt = new Date();
    await customer.save();

    res.json({
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/customers/:id/loyalty/points
// @desc    Add or redeem loyalty points
// @access  Private
router.post('/:id/loyalty/points', auth, async (req, res) => {
  try {
    const { points, type, orderId, notes } = req.body; // type: 'earn', 'redeem'
    
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: 'Customer not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(customer.store.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    if (type === 'redeem' && customer.loyalty.points < points) {
      return res.status(400).json({
        message: 'Insufficient loyalty points'
      });
    }

    // Update points
    if (type === 'earn') {
      customer.loyalty.points += points;
      customer.loyalty.totalEarned += points;
    } else if (type === 'redeem') {
      customer.loyalty.points -= points;
      customer.loyalty.totalRedeemed += points;
    }

    // Add transaction to history
    customer.loyalty.transactions.push({
      type,
      points,
      orderId,
      notes,
      date: new Date(),
      processedBy: req.user._id
    });

    // Update loyalty tier based on total earned points
    if (customer.loyalty.totalEarned >= 10000) {
      customer.loyalty.tier = 'platinum';
    } else if (customer.loyalty.totalEarned >= 5000) {
      customer.loyalty.tier = 'gold';
    } else if (customer.loyalty.totalEarned >= 1000) {
      customer.loyalty.tier = 'silver';
    }

    customer.updatedBy = req.user._id;
    customer.updatedAt = new Date();

    await customer.save();

    res.json({
      message: `Loyalty points ${type}ed successfully`,
      customer: {
        _id: customer._id,
        name: customer.name,
        loyalty: customer.loyalty
      }
    });
  } catch (error) {
    console.error('Loyalty points error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/customers/:id/purchase-history
// @desc    Get customer purchase history
// @access  Private
router.get('/:id/purchase-history', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const customer = await Customer.findById(req.params.id)
      .populate({
        path: 'purchaseHistory.orders',
        options: {
          sort: { createdAt: -1 },
          skip: (page - 1) * limit,
          limit: limit
        },
        populate: {
          path: 'items.product items.variant'
        }
      });

    if (!customer) {
      return res.status(404).json({
        message: 'Customer not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(customer.store.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    res.json({
      customer: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        purchaseHistory: customer.purchaseHistory
      },
      pagination: {
        page,
        limit
      }
    });
  } catch (error) {
    console.error('Get purchase history error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
