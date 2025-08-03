const express = require('express');
const Product = require('../models/Product');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/inventory/overview
// @desc    Get inventory overview
// @access  Private
router.get('/overview', auth, async (req, res) => {
  try {
    const filter = { isActive: true };

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    // Get basic inventory statistics
    const products = await Product.find(filter);
    
    let totalProducts = 0;
    let totalVariants = 0;
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    
    const categoryStats = {};
    const lowStockItems = [];

    products.forEach(product => {
      totalProducts++;
      
      if (!categoryStats[product.category]) {
        categoryStats[product.category] = {
          products: 0,
          variants: 0,
          value: 0,
          lowStock: 0,
          outOfStock: 0
        };
      }
      categoryStats[product.category].products++;

      product.variants.forEach(variant => {
        totalVariants++;
        categoryStats[product.category].variants++;
        
        const stockValue = variant.inventory.quantity * variant.price;
        totalValue += stockValue;
        categoryStats[product.category].value += stockValue;

        const isLowStock = variant.inventory.quantity <= variant.inventory.lowStockThreshold;
        const isOutOfStock = variant.inventory.quantity === 0;

        if (isLowStock) {
          lowStockCount++;
          categoryStats[product.category].lowStock++;
          
          lowStockItems.push({
            product: {
              _id: product._id,
              name: product.name,
              category: product.category
            },
            variant: {
              _id: variant._id,
              sku: variant.sku,
              attributes: variant.attributes,
              quantity: variant.inventory.quantity,
              lowStockThreshold: variant.inventory.lowStockThreshold
            }
          });
        }

        if (isOutOfStock) {
          outOfStockCount++;
          categoryStats[product.category].outOfStock++;
        }
      });
    });

    res.json({
      overview: {
        totalProducts,
        totalVariants,
        totalValue: Math.round(totalValue * 100) / 100,
        lowStockCount,
        outOfStockCount
      },
      categoryBreakdown: Object.entries(categoryStats).map(([category, stats]) => ({
        category,
        ...stats,
        value: Math.round(stats.value * 100) / 100
      })),
      lowStockItems: lowStockItems.slice(0, 10), // Top 10 low stock items
      alerts: {
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        needsReorder: lowStockItems.filter(item => item.variant.quantity === 0).length
      }
    });
  } catch (error) {
    console.error('Inventory overview error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/inventory/movements
// @desc    Get inventory movement history
// @access  Private
router.get('/movements', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { isActive: true };

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    // Date filter
    if (req.query.startDate || req.query.endDate) {
      filter['inventoryLogs.createdAt'] = {};
      if (req.query.startDate) filter['inventoryLogs.createdAt'].$gte = new Date(req.query.startDate);
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate);
        endDate.setHours(23, 59, 59, 999);
        filter['inventoryLogs.createdAt'].$lte = endDate;
      }
    }

    const products = await Product.find(filter)
      .populate('store', 'name location')
      .populate('inventoryLogs.updatedBy', 'username profile.firstName profile.lastName')
      .sort({ 'inventoryLogs.createdAt': -1 });

    // Flatten inventory logs with product details
    const movements = [];
    products.forEach(product => {
      product.inventoryLogs.forEach(log => {
        const variant = product.variants.id(log.variant);
        movements.push({
          _id: log._id,
          product: {
            _id: product._id,
            name: product.name,
            category: product.category,
            store: product.store
          },
          variant: variant ? {
            _id: variant._id,
            sku: variant.sku,
            attributes: variant.attributes
          } : null,
          movement: {
            type: log.type,
            quantity: log.quantity,
            oldQuantity: log.oldQuantity,
            newQuantity: log.newQuantity,
            notes: log.notes,
            updatedBy: log.updatedBy,
            createdAt: log.createdAt
          }
        });
      });
    });

    // Sort by date and apply pagination
    movements.sort((a, b) => new Date(b.movement.createdAt) - new Date(a.movement.createdAt));
    const paginatedMovements = movements.slice(skip, skip + limit);

    res.json({
      movements: paginatedMovements,
      pagination: {
        page,
        limit,
        total: movements.length,
        pages: Math.ceil(movements.length / limit)
      }
    });
  } catch (error) {
    console.error('Inventory movements error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/inventory/adjust
// @desc    Adjust inventory for multiple items
// @access  Private (Manager/Admin)
router.post('/adjust', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { adjustments, notes } = req.body;

    if (!adjustments || !Array.isArray(adjustments)) {
      return res.status(400).json({
        message: 'Adjustments array is required'
      });
    }

    const results = [];

    for (const adjustment of adjustments) {
      const { productId, variantId, type, quantity, reason } = adjustment;

      const product = await Product.findById(productId);
      if (!product) {
        results.push({
          productId,
          variantId,
          success: false,
          error: 'Product not found'
        });
        continue;
      }

      // Check store access
      if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
        if (!req.user.storeAccess.includes(product.store.toString())) {
          results.push({
            productId,
            variantId,
            success: false,
            error: 'Access denied'
          });
          continue;
        }
      }

      const variant = product.variants.id(variantId);
      if (!variant) {
        results.push({
          productId,
          variantId,
          success: false,
          error: 'Variant not found'
        });
        continue;
      }

      const oldQuantity = variant.inventory.quantity;
      let newQuantity;

      switch (type) {
        case 'add':
          newQuantity = oldQuantity + quantity;
          break;
        case 'remove':
          newQuantity = Math.max(0, oldQuantity - quantity);
          break;
        case 'set':
          newQuantity = quantity;
          break;
        default:
          results.push({
            productId,
            variantId,
            success: false,
            error: 'Invalid adjustment type'
          });
          continue;
      }

      variant.inventory.quantity = newQuantity;
      variant.inventory.lastUpdated = new Date();

      // Add inventory log
      product.inventoryLogs.push({
        variant: variantId,
        type,
        oldQuantity,
        newQuantity,
        quantity: type === 'set' ? newQuantity : quantity,
        notes: `${reason || 'Manual adjustment'}${notes ? ` | ${notes}` : ''}`,
        updatedBy: req.user._id
      });

      product.updatedBy = req.user._id;
      product.updatedAt = new Date();

      try {
        await product.save();
        results.push({
          productId,
          variantId,
          success: true,
          oldQuantity,
          newQuantity,
          adjustment: type === 'set' ? newQuantity : quantity
        });
      } catch (error) {
        results.push({
          productId,
          variantId,
          success: false,
          error: error.message
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      message: `Inventory adjustment completed. ${successful} successful, ${failed} failed.`,
      results,
      summary: {
        total: adjustments.length,
        successful,
        failed
      }
    });
  } catch (error) {
    console.error('Inventory adjustment error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/inventory/low-stock
// @desc    Get low stock and out of stock items
// @access  Private
router.get('/low-stock', auth, async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 5;
    const includeOutOfStock = req.query.includeOutOfStock !== 'false';
    const category = req.query.category;

    const filter = { isActive: true };

    if (category) filter.category = category;

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    const products = await Product.find(filter)
      .populate('store', 'name location')
      .sort({ name: 1 });

    const lowStockItems = [];
    const outOfStockItems = [];

    products.forEach(product => {
      product.variants.forEach(variant => {
        const isLowStock = variant.inventory.quantity <= Math.max(threshold, variant.inventory.lowStockThreshold);
        const isOutOfStock = variant.inventory.quantity === 0;

        const item = {
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
            quantity: variant.inventory.quantity,
            lowStockThreshold: variant.inventory.lowStockThreshold,
            price: variant.price,
            cost: variant.cost || 0
          },
          reorderSuggestion: variant.inventory.lowStockThreshold * 3 // Suggest 3x threshold
        };

        if (isOutOfStock && includeOutOfStock) {
          outOfStockItems.push(item);
        } else if (isLowStock && !isOutOfStock) {
          lowStockItems.push(item);
        }
      });
    });

    res.json({
      lowStockItems,
      outOfStockItems,
      summary: {
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        threshold
      }
    });
  } catch (error) {
    console.error('Low stock items error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/inventory/valuation
// @desc    Get inventory valuation report
// @access  Private (Manager/Admin)
router.get('/valuation', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const filter = { isActive: true };

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    const products = await Product.find(filter)
      .populate('store', 'name location');

    const valuation = {
      totalCostValue: 0,
      totalSellingValue: 0,
      totalPotentialProfit: 0,
      categories: {},
      items: []
    };

    products.forEach(product => {
      if (!valuation.categories[product.category]) {
        valuation.categories[product.category] = {
          costValue: 0,
          sellingValue: 0,
          profit: 0,
          items: 0
        };
      }

      product.variants.forEach(variant => {
        const costValue = (variant.cost || 0) * variant.inventory.quantity;
        const sellingValue = variant.price * variant.inventory.quantity;
        const profit = sellingValue - costValue;

        valuation.totalCostValue += costValue;
        valuation.totalSellingValue += sellingValue;
        valuation.totalPotentialProfit += profit;

        valuation.categories[product.category].costValue += costValue;
        valuation.categories[product.category].sellingValue += sellingValue;
        valuation.categories[product.category].profit += profit;
        valuation.categories[product.category].items++;

        valuation.items.push({
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
            quantity: variant.inventory.quantity,
            price: variant.price,
            cost: variant.cost || 0
          },
          valuation: {
            costValue: Math.round(costValue * 100) / 100,
            sellingValue: Math.round(sellingValue * 100) / 100,
            profit: Math.round(profit * 100) / 100,
            margin: sellingValue > 0 ? Math.round((profit / sellingValue) * 100 * 100) / 100 : 0
          }
        });
      });
    });

    // Round summary values
    valuation.totalCostValue = Math.round(valuation.totalCostValue * 100) / 100;
    valuation.totalSellingValue = Math.round(valuation.totalSellingValue * 100) / 100;
    valuation.totalPotentialProfit = Math.round(valuation.totalPotentialProfit * 100) / 100;

    // Round category values
    Object.keys(valuation.categories).forEach(category => {
      const cat = valuation.categories[category];
      cat.costValue = Math.round(cat.costValue * 100) / 100;
      cat.sellingValue = Math.round(cat.sellingValue * 100) / 100;
      cat.profit = Math.round(cat.profit * 100) / 100;
      cat.margin = cat.sellingValue > 0 ? Math.round((cat.profit / cat.sellingValue) * 100 * 100) / 100 : 0;
    });

    // Sort items by selling value descending
    valuation.items.sort((a, b) => b.valuation.sellingValue - a.valuation.sellingValue);

    res.json({
      summary: {
        totalCostValue: valuation.totalCostValue,
        totalSellingValue: valuation.totalSellingValue,
        totalPotentialProfit: valuation.totalPotentialProfit,
        overallMargin: valuation.totalSellingValue > 0 
          ? Math.round((valuation.totalPotentialProfit / valuation.totalSellingValue) * 100 * 100) / 100 
          : 0
      },
      categoryBreakdown: valuation.categories,
      items: valuation.items.slice(0, 100), // Top 100 items by value
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Inventory valuation error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
