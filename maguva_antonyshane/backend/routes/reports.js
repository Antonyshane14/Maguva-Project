const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/reports/dashboard
// @desc    Get dashboard analytics
// @access  Private (Manager/Admin)
router.get('/dashboard', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const daysBack = parseInt(period);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    const filter = {
      createdAt: { $gte: startDate },
      status: { $ne: 'cancelled' }
    };

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    // Revenue and orders
    const revenueData = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totals.grandTotal' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totals.grandTotal' }
        }
      }
    ]);

    // Compare with previous period
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - daysBack);
    
    const prevFilter = {
      createdAt: { $gte: prevStartDate, $lt: startDate },
      status: { $ne: 'cancelled' }
    };

    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      prevFilter.store = { $in: req.user.storeAccess };
    }

    const prevRevenueData = await Order.aggregate([
      { $match: prevFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totals.grandTotal' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    // Daily sales trend
    const dailySales = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$totals.grandTotal' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Top products
    const topProducts = await Order.aggregate([
      { $match: filter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
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
          name: '$product.name',
          category: '$product.category',
          quantity: 1,
          revenue: 1
        }
      }
    ]);

    // Payment methods distribution
    const paymentMethods = await Order.aggregate([
      { $match: filter },
      { $unwind: '$payments' },
      {
        $group: {
          _id: '$payments.method',
          count: { $sum: 1 },
          amount: { $sum: '$payments.amount' }
        }
      }
    ]);

    // Customer insights
    const customerFilter = { isActive: true };
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      customerFilter.store = { $in: req.user.storeAccess };
    }

    const totalCustomers = await Customer.countDocuments(customerFilter);
    const newCustomers = await Customer.countDocuments({
      ...customerFilter,
      createdAt: { $gte: startDate }
    });

    // Low stock alerts
    const lowStockProducts = await Product.aggregate([
      {
        $match: {
          isActive: true,
          ...(req.user.role !== 'admin' && req.user.storeAccess?.length > 0
            ? { store: { $in: req.user.storeAccess } }
            : {})
        }
      },
      { $unwind: '$variants' },
      {
        $match: {
          $expr: {
            $lte: ['$variants.inventory.quantity', '$variants.inventory.lowStockThreshold']
          }
        }
      },
      {
        $project: {
          name: 1,
          'variants.sku': 1,
          'variants.inventory.quantity': 1,
          'variants.inventory.lowStockThreshold': 1
        }
      },
      { $limit: 10 }
    ]);

    const current = revenueData[0] || { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 };
    const previous = prevRevenueData[0] || { totalRevenue: 0, totalOrders: 0 };

    // Calculate growth percentages
    const revenueGrowth = previous.totalRevenue > 0 
      ? ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100 
      : 0;
    
    const ordersGrowth = previous.totalOrders > 0 
      ? ((current.totalOrders - previous.totalOrders) / previous.totalOrders) * 100 
      : 0;

    res.json({
      period: `${daysBack} days`,
      summary: {
        revenue: {
          current: current.totalRevenue,
          previous: previous.totalRevenue,
          growth: revenueGrowth
        },
        orders: {
          current: current.totalOrders,
          previous: previous.totalOrders,
          growth: ordersGrowth
        },
        averageOrderValue: current.averageOrderValue,
        customers: {
          total: totalCustomers,
          new: newCustomers
        }
      },
      dailySales,
      topProducts,
      paymentMethods,
      lowStockAlerts: lowStockProducts.length,
      lowStockProducts
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/reports/sales
// @desc    Get detailed sales report
// @access  Private (Manager/Admin)
router.get('/sales', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      groupBy = 'day', // day, week, month
      storeId,
      categoryId,
      productId
    } = req.query;

    const filter = {
      status: { $ne: 'cancelled' }
    };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (storeId) filter.store = storeId;

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    // Group by configuration
    let groupByConfig;
    switch (groupBy) {
      case 'week':
        groupByConfig = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'month':
        groupByConfig = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      case 'hour':
        groupByConfig = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
        break;
      default: // day
        groupByConfig = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
    }

    // Sales by period
    const salesByPeriod = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: groupByConfig,
          revenue: { $sum: '$totals.grandTotal' },
          orders: { $sum: 1 },
          items: { $sum: { $size: '$items' } },
          avgOrderValue: { $avg: '$totals.grandTotal' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    // Product performance
    let productFilter = { $match: filter };
    if (categoryId || productId) {
      const productMatch = {};
      if (productId) productMatch['items.product'] = productId;
      productFilter = { $match: { ...filter, ...productMatch } };
    }

    const productPerformance = await Order.aggregate([
      productFilter,
      { $unwind: '$items' },
      ...(categoryId ? [{
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      }, {
        $match: { 'productInfo.category': categoryId }
      }] : []),
      {
        $group: {
          _id: '$items.product',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          orders: { $addToSet: '$_id' }
        }
      },
      {
        $addFields: {
          orderCount: { $size: '$orders' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 20 },
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
          product: {
            _id: '$product._id',
            name: '$product.name',
            category: '$product.category'
          },
          quantity: 1,
          revenue: 1,
          orderCount: 1,
          avgPrice: { $divide: ['$revenue', '$quantity'] }
        }
      }
    ]);

    // Category performance
    const categoryPerformance = await Order.aggregate([
      { $match: filter },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          products: { $addToSet: '$product._id' },
          orders: { $addToSet: '$_id' }
        }
      },
      {
        $addFields: {
          productCount: { $size: '$products' },
          orderCount: { $size: '$orders' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Summary statistics
    const summary = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totals.grandTotal' },
          totalOrders: { $sum: 1 },
          totalItems: { $sum: { $sum: '$items.quantity' } },
          avgOrderValue: { $avg: '$totals.grandTotal' },
          maxOrderValue: { $max: '$totals.grandTotal' },
          minOrderValue: { $min: '$totals.grandTotal' }
        }
      }
    ]);

    res.json({
      filter: {
        startDate,
        endDate,
        groupBy,
        storeId,
        categoryId,
        productId
      },
      summary: summary[0] || {},
      salesByPeriod,
      productPerformance,
      categoryPerformance
    });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/reports/inventory
// @desc    Get inventory report
// @access  Private (Manager/Admin)
router.get('/inventory', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { category, lowStock, outOfStock, storeId } = req.query;

    const filter = { isActive: true };
    
    if (category) filter.category = category;
    if (storeId) filter.store = storeId;

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    const products = await Product.find(filter)
      .populate('store', 'name location')
      .sort({ name: 1 });

    const inventoryReport = [];
    let totalProducts = 0;
    let totalVariants = 0;
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach(product => {
      totalProducts++;
      
      product.variants.forEach(variant => {
        totalVariants++;
        const stockValue = variant.inventory.quantity * variant.price;
        totalValue += stockValue;

        const isLowStock = variant.inventory.quantity <= variant.inventory.lowStockThreshold;
        const isOutOfStock = variant.inventory.quantity === 0;

        if (isLowStock) lowStockCount++;
        if (isOutOfStock) outOfStockCount++;

        // Apply filters
        if (lowStock === 'true' && !isLowStock) return;
        if (outOfStock === 'true' && !isOutOfStock) return;

        inventoryReport.push({
          product: {
            _id: product._id,
            name: product.name,
            category: product.category,
            store: product.store
          },
          variant: {
            _id: variant._id,
            sku: variant.sku,
            attributes: variant.attributes,
            price: variant.price,
            cost: variant.cost || 0,
            quantity: variant.inventory.quantity,
            lowStockThreshold: variant.inventory.lowStockThreshold,
            lastUpdated: variant.inventory.lastUpdated
          },
          status: {
            isLowStock,
            isOutOfStock
          },
          value: stockValue,
          profit: stockValue - (variant.cost || 0) * variant.inventory.quantity
        });
      });
    });

    // Sort by value descending
    inventoryReport.sort((a, b) => b.value - a.value);

    // Category breakdown
    const categoryBreakdown = await Product.aggregate([
      { $match: filter },
      { $unwind: '$variants' },
      {
        $group: {
          _id: '$category',
          products: { $addToSet: '$_id' },
          totalQuantity: { $sum: '$variants.inventory.quantity' },
          totalValue: { $sum: { $multiply: ['$variants.inventory.quantity', '$variants.price'] } },
          variants: { $sum: 1 }
        }
      },
      {
        $addFields: {
          productCount: { $size: '$products' }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    res.json({
      summary: {
        totalProducts,
        totalVariants,
        totalValue,
        lowStockCount,
        outOfStockCount,
        stockTurnover: 0 // Would need sales data to calculate
      },
      categoryBreakdown,
      inventory: inventoryReport,
      filters: { category, lowStock, outOfStock, storeId }
    });
  } catch (error) {
    console.error('Inventory report error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/reports/customers
// @desc    Get customer report
// @access  Private (Manager/Admin)
router.get('/customers', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate, tier, type, storeId } = req.query;

    const filter = { isActive: true };
    
    if (tier) filter['loyalty.tier'] = tier;
    if (type) filter.customerType = type;
    if (storeId) filter.store = storeId;

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }

    // Customer summary
    const totalCustomers = await Customer.countDocuments(filter);
    const newCustomers = await Customer.countDocuments({ ...filter, ...dateFilter });

    // Customer by tier
    const customersByTier = await Customer.aggregate([
      { $match: filter },
      { $group: { _id: '$loyalty.tier', count: { $sum: 1 } } }
    ]);

    // Customer by type
    const customersByType = await Customer.aggregate([
      { $match: filter },
      { $group: { _id: '$customerType', count: { $sum: 1 } } }
    ]);

    // Top customers by purchase value
    const topCustomers = await Customer.find(filter)
      .sort({ 'purchaseHistory.totalSpent': -1 })
      .limit(20)
      .populate('store', 'name location')
      .select('name email phone customerType loyalty purchaseHistory');

    // Customer acquisition trend
    const acquisitionTrend = await Customer.aggregate([
      { $match: { ...filter, ...dateFilter } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Loyalty points summary
    const loyaltyStats = await Customer.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$loyalty.points' },
          totalEarned: { $sum: '$loyalty.totalEarned' },
          totalRedeemed: { $sum: '$loyalty.totalRedeemed' },
          avgPoints: { $avg: '$loyalty.points' }
        }
      }
    ]);

    // Customers with birthdays this month
    const thisMonth = new Date();
    const nextMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 1);
    
    const birthdayCustomers = await Customer.find({
      ...filter,
      'personalInfo.birthday': {
        $regex: `^\\d{4}-${String(thisMonth.getMonth() + 1).padStart(2, '0')}`
      }
    }).select('name email phone personalInfo.birthday');

    res.json({
      summary: {
        totalCustomers,
        newCustomers,
        loyaltyStats: loyaltyStats[0] || {},
        birthdayCustomers: birthdayCustomers.length
      },
      customersByTier,
      customersByType,
      topCustomers,
      acquisitionTrend,
      birthdayCustomers,
      filters: { startDate, endDate, tier, type, storeId }
    });
  } catch (error) {
    console.error('Customer report error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/reports/gst
// @desc    Get GST report for tax filing
// @access  Private (Manager/Admin)
router.get('/gst', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate, storeId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'Start date and end date are required for GST report'
      });
    }

    const filter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      },
      status: { $ne: 'cancelled' }
    };

    if (storeId) filter.store = storeId;

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    // GST Summary
    const gstSummary = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totals.subtotal' },
          totalCGST: { $sum: '$totals.tax.cgst' },
          totalSGST: { $sum: '$totals.tax.sgst' },
          totalIGST: { $sum: '$totals.tax.igst' },
          totalTax: { $sum: '$totals.tax.total' },
          totalInvoiceValue: { $sum: '$totals.grandTotal' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    // GST by rate
    const gstByRate = await Order.aggregate([
      { $match: filter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.gst.rate',
          taxableValue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          cgst: { $sum: '$items.gst.cgst' },
          sgst: { $sum: '$items.gst.sgst' },
          igst: { $sum: '$items.gst.igst' },
          totalTax: { $sum: '$items.gst.total' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Monthly breakdown
    const monthlyGST = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalSales: { $sum: '$totals.subtotal' },
          totalTax: { $sum: '$totals.tax.total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Detailed transactions for GSTR filing
    const transactions = await Order.find(filter)
      .populate('customer', 'name email gstInfo')
      .populate('store', 'name gstNumber address')
      .select('orderNumber customer store totals createdAt items')
      .sort({ createdAt: 1 });

    res.json({
      period: { startDate, endDate },
      summary: gstSummary[0] || {},
      gstByRate,
      monthlyBreakdown: monthlyGST,
      transactions: transactions.map(order => ({
        date: order.createdAt,
        invoiceNumber: order.orderNumber,
        customer: {
          name: order.customer?.name || 'Walk-in Customer',
          gstin: order.customer?.gstInfo?.number || '',
          state: order.customer?.gstInfo?.state || ''
        },
        taxableValue: order.totals.subtotal,
        cgst: order.totals.tax.cgst,
        sgst: order.totals.tax.sgst,
        igst: order.totals.tax.igst,
        totalTax: order.totals.tax.total,
        invoiceValue: order.totals.grandTotal
      })),
      generatedAt: new Date(),
      generatedBy: req.user.username
    });
  } catch (error) {
    console.error('GST report error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/reports/export/:type
// @desc    Export reports as CSV/Excel
// @access  Private (Manager/Admin)
router.get('/export/:type', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'csv', ...filters } = req.query;

    // This would typically use a library like 'json2csv' or 'exceljs'
    // For now, we'll return the data structure that can be exported

    let data = [];
    let filename = '';

    switch (type) {
      case 'sales':
        // Get sales data based on filters
        const salesFilter = {
          status: { $ne: 'cancelled' }
        };
        
        if (filters.startDate || filters.endDate) {
          salesFilter.createdAt = {};
          if (filters.startDate) salesFilter.createdAt.$gte = new Date(filters.startDate);
          if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            salesFilter.createdAt.$lte = end;
          }
        }

        const salesData = await Order.find(salesFilter)
          .populate('customer', 'name email phone')
          .populate('store', 'name')
          .sort({ createdAt: -1 });

        data = salesData.map(order => ({
          orderNumber: order.orderNumber,
          date: order.createdAt.toISOString().split('T')[0],
          customer: order.customer?.name || 'Walk-in',
          store: order.store?.name || '',
          subtotal: order.totals.subtotal,
          tax: order.totals.tax.total,
          total: order.totals.grandTotal,
          status: order.status,
          paymentStatus: order.paymentStatus
        }));

        filename = `sales_report_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'inventory':
        const inventoryData = await Product.find({ isActive: true })
          .populate('store', 'name');

        data = [];
        inventoryData.forEach(product => {
          product.variants.forEach(variant => {
            data.push({
              product: product.name,
              sku: variant.sku,
              category: product.category,
              store: product.store?.name || '',
              quantity: variant.inventory.quantity,
              price: variant.price,
              cost: variant.cost || 0,
              value: variant.inventory.quantity * variant.price,
              lowStockThreshold: variant.inventory.lowStockThreshold,
              isLowStock: variant.inventory.quantity <= variant.inventory.lowStockThreshold
            });
          });
        });

        filename = `inventory_report_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'customers':
        const customerData = await Customer.find({ isActive: true })
          .populate('store', 'name');

        data = customerData.map(customer => ({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          customerType: customer.customerType,
          loyaltyTier: customer.loyalty.tier,
          loyaltyPoints: customer.loyalty.points,
          totalSpent: customer.purchaseHistory.totalSpent,
          orderCount: customer.purchaseHistory.orderCount,
          joinDate: customer.createdAt.toISOString().split('T')[0],
          lastPurchase: customer.purchaseHistory.lastPurchaseDate?.toISOString().split('T')[0] || '',
          store: customer.store?.name || ''
        }));

        filename = `customers_report_${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return res.status(400).json({
          message: 'Invalid report type'
        });
    }

    res.json({
      type,
      format,
      filename,
      data,
      count: data.length,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
