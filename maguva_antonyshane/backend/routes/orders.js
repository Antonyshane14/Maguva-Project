const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/orders/reports/analytics
// @desc    Get order analytics
// @access  Private (Manager/Admin)
router.get('/reports/analytics', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate, period = 'day' } = req.query;
    
    const filter = {};
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    } else {
      // Default to last 30 days
      filter.createdAt = {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      };
    }

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    // Basic analytics
    const totalOrders = await Order.countDocuments(filter);
    
    const ordersByStatus = await Order.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const revenue = await Order.aggregate([
      { $match: { ...filter, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totals.grandTotal' } } }
    ]);

    const averageOrderValue = await Order.aggregate([
      { $match: { ...filter, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, avg: { $avg: '$totals.grandTotal' } } }
    ]);

    // Sales by period
    let groupBy;
    switch (period) {
      case 'hour':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
        break;
      case 'day':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'month':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      default:
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
    }

    const salesByPeriod = await Order.aggregate([
      { $match: { ...filter, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: groupBy,
          orders: { $sum: 1 },
          revenue: { $sum: '$totals.grandTotal' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    // Top products
    const topProducts = await Order.aggregate([
      { $match: { ...filter, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          product: '$product.name',
          category: '$product.category',
          quantity: 1,
          revenue: 1
        }
      }
    ]);

    res.json({
      summary: {
        totalOrders,
        totalRevenue: revenue[0]?.total || 0,
        averageOrderValue: averageOrderValue[0]?.avg || 0
      },
      ordersByStatus,
      salesByPeriod,
      topProducts,
      period
    });
  } catch (error) {
    console.error('Get order analytics error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/orders
// @desc    Get all orders with pagination and filters
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }
    
    if (req.query.customer) {
      filter.customer = req.query.customer;
    }
    
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name email phone customerCode')
      .populate('store', 'name location')
      .populate('items.product', 'name category')
      .populate('createdBy', 'username profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer')
      .populate('store', 'name location')
      .populate('items.product')
      .populate('createdBy', 'username profile.firstName profile.lastName')
      .populate('updatedBy', 'username profile.firstName profile.lastName');

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(order.store._id.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const orderData = req.body;
    
    // Set store from user's primary store if not provided
    if (!orderData.store && req.user.storeAccess?.length > 0) {
      orderData.store = req.user.storeAccess[0];
    }

    // Generate order number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const orderCount = await Order.countDocuments({
      createdAt: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      }
    });
    const orderNumber = `ORD-${dateStr}-${String(orderCount + 1).padStart(4, '0')}`;

    // Validate inventory for each item
    for (const item of orderData.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          message: `Product not found: ${item.product}`
        });
      }

      const variant = product.variants.id(item.variant);
      if (!variant) {
        return res.status(400).json({
          message: `Product variant not found: ${item.variant}`
        });
      }

      if (variant.inventory.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name} - ${variant.sku}. Available: ${variant.inventory.quantity}, Requested: ${item.quantity}`
        });
      }
    }

    const order = new Order({
      ...orderData,
      orderNumber,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await order.save();

    // Update inventory
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      const variant = product.variants.id(item.variant);
      variant.inventory.quantity -= item.quantity;
      variant.inventory.lastUpdated = new Date();

      // Add inventory log
      product.inventoryLogs.push({
        variant: item.variant,
        type: 'remove',
        oldQuantity: variant.inventory.quantity + item.quantity,
        newQuantity: variant.inventory.quantity,
        quantity: item.quantity,
        notes: `Order ${order.orderNumber}`,
        updatedBy: req.user._id
      });

      await product.save();
    }

    // Update customer purchase history
    if (order.customer) {
      const customer = await Customer.findById(order.customer);
      if (customer) {
        customer.purchaseHistory.orders.push(order._id);
        customer.purchaseHistory.totalSpent += order.totals.grandTotal;
        customer.purchaseHistory.orderCount += 1;
        customer.purchaseHistory.lastPurchaseDate = new Date();

        // Add loyalty points (1 point per rupee spent)
        const pointsEarned = Math.floor(order.totals.grandTotal);
        customer.loyalty.points += pointsEarned;
        customer.loyalty.totalEarned += pointsEarned;

        customer.loyalty.transactions.push({
          type: 'earn',
          points: pointsEarned,
          orderId: order._id,
          notes: `Order ${order.orderNumber}`,
          date: new Date(),
          processedBy: req.user._id
        });

        await customer.save();
      }
    }

    await order.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'store', select: 'name location' },
      { path: 'items.product', select: 'name category' }
    ]);

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/orders/:id
// @desc    Update order
// @access  Private (Manager/Admin)
router.put('/:id', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(order.store.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    // Prevent updating completed or cancelled orders
    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        message: 'Cannot update completed or cancelled orders'
      });
    }

    // Update order
    Object.assign(order, req.body);
    order.updatedBy = req.user._id;
    order.updatedAt = new Date();

    await order.save();
    await order.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'store', select: 'name location' },
      { path: 'items.product', select: 'name category' }
    ]);

    res.json({
      message: 'Order updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(order.store.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['ready', 'cancelled'],
      'ready': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from ${order.status} to ${status}`
      });
    }

    const oldStatus = order.status;
    order.status = status;
    order.updatedBy = req.user._id;
    order.updatedAt = new Date();

    // Add status history
    order.statusHistory.push({
      status,
      changedBy: req.user._id,
      changedAt: new Date(),
      notes
    });

    // Handle cancelled orders - restore inventory
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          const variant = product.variants.id(item.variant);
          if (variant) {
            variant.inventory.quantity += item.quantity;
            variant.inventory.lastUpdated = new Date();

            // Add inventory log
            product.inventoryLogs.push({
              variant: item.variant,
              type: 'add',
              oldQuantity: variant.inventory.quantity - item.quantity,
              newQuantity: variant.inventory.quantity,
              quantity: item.quantity,
              notes: `Order ${order.orderNumber} cancelled`,
              updatedBy: req.user._id
            });

            await product.save();
          }
        }
      }
    }

    await order.save();

    res.json({
      message: 'Order status updated successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusHistory: order.statusHistory
      }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/orders/:id/payment
// @desc    Add payment to order
// @access  Private
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const { method, amount, reference, notes } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(order.store.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    const totalPaid = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = order.totals.grandTotal - totalPaid;

    if (amount > remaining) {
      return res.status(400).json({
        message: 'Payment amount exceeds remaining balance'
      });
    }

    // Add payment
    order.payments.push({
      method,
      amount,
      reference,
      notes,
      processedBy: req.user._id,
      processedAt: new Date()
    });

    // Update payment status
    const newTotalPaid = totalPaid + amount;
    if (newTotalPaid >= order.totals.grandTotal) {
      order.paymentStatus = 'paid';
    } else if (newTotalPaid > 0) {
      order.paymentStatus = 'partial';
    }

    order.updatedBy = req.user._id;
    order.updatedAt = new Date();

    await order.save();

    res.json({
      message: 'Payment added successfully',
      payment: order.payments[order.payments.length - 1],
      paymentStatus: order.paymentStatus,
      totalPaid: newTotalPaid,
      remaining: order.totals.grandTotal - newTotalPaid
    });
  } catch (error) {
    console.error('Add payment error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/orders/:id/invoice
// @desc    Generate invoice for order
// @access  Private
router.get('/:id/invoice', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer')
      .populate('store')
      .populate('items.product')
      .populate('createdBy', 'username profile');

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(order.store._id.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    // Generate invoice data
    const invoice = {
      order,
      generatedAt: new Date(),
      generatedBy: req.user
    };

    res.json({
      message: 'Invoice generated successfully',
      invoice
    });
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
