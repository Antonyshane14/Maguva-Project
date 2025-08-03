const express = require('express');
const Product = require('../models/Product');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/products/reports/low-stock
// @desc    Get products with low stock
// @access  Private
router.get('/reports/low-stock', auth, async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;
    
    const filter = { 
      isActive: true,
      'variants.inventory.quantity': { $lte: threshold }
    };

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    const products = await Product.find(filter)
      .populate('store', 'name location')
      .sort({ 'variants.inventory.quantity': 1 });

    const lowStockItems = [];
    products.forEach(product => {
      product.variants.forEach(variant => {
        if (variant.inventory.quantity <= threshold) {
          lowStockItems.push({
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
              lowStockThreshold: variant.inventory.lowStockThreshold
            }
          });
        }
      });
    });

    res.json({
      lowStockItems,
      count: lowStockItems.length,
      threshold
    });
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/products
// @desc    Get all products with pagination and filters
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
        { description: { $regex: req.query.search, $options: 'i' } },
        { 'variants.sku': { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.brand) {
      filter.brand = req.query.brand;
    }
    
    if (req.query.minPrice || req.query.maxPrice) {
      filter.basePrice = {};
      if (req.query.minPrice) filter.basePrice.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.basePrice.$lte = parseFloat(req.query.maxPrice);
    }
    
    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    const products = await Product.find(filter)
      .populate('store', 'name location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('store', 'name location');

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(product.store._id.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private (Manager/Admin)
router.post('/', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const productData = req.body;
    
    // Set store from user's primary store if not provided
    if (!productData.store && req.user.storeAccess?.length > 0) {
      productData.store = req.user.storeAccess[0];
    }

    const product = new Product({
      ...productData,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await product.save();
    await product.populate('store', 'name location');

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Product with this SKU already exists'
      });
    }
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (Manager/Admin)
router.put('/:id', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(product.store.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    // Update product
    Object.assign(product, req.body);
    product.updatedBy = req.user._id;
    product.updatedAt = new Date();

    await product.save();
    await product.populate('store', 'name location');

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product (soft delete)
// @access  Private (Admin only)
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    product.isActive = false;
    product.updatedBy = req.user._id;
    product.updatedAt = new Date();
    await product.save();

    res.json({
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/products/:id/variants
// @desc    Add product variant
// @access  Private (Manager/Admin)
router.post('/:id/variants', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(product.store.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    const variant = req.body;
    
    // Check if SKU already exists
    const existingVariant = product.variants.find(v => v.sku === variant.sku);
    if (existingVariant) {
      return res.status(400).json({
        message: 'Variant with this SKU already exists'
      });
    }

    product.variants.push(variant);
    product.updatedBy = req.user._id;
    product.updatedAt = new Date();

    await product.save();

    res.status(201).json({
      message: 'Variant added successfully',
      product
    });
  } catch (error) {
    console.error('Add variant error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/products/:id/variants/:variantId
// @desc    Update product variant
// @access  Private (Manager/Admin)
router.put('/:id/variants/:variantId', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(product.store.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    const variant = product.variants.id(req.params.variantId);
    if (!variant) {
      return res.status(404).json({
        message: 'Variant not found'
      });
    }

    Object.assign(variant, req.body);
    product.updatedBy = req.user._id;
    product.updatedAt = new Date();

    await product.save();

    res.json({
      message: 'Variant updated successfully',
      product
    });
  } catch (error) {
    console.error('Update variant error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/products/:id/variants/:variantId
// @desc    Delete product variant
// @access  Private (Admin only)
router.delete('/:id/variants/:variantId', auth, authorize(['admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    product.variants.id(req.params.variantId).remove();
    product.updatedBy = req.user._id;
    product.updatedAt = new Date();

    await product.save();

    res.json({
      message: 'Variant deleted successfully',
      product
    });
  } catch (error) {
    console.error('Delete variant error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/products/:id/inventory
// @desc    Update product inventory
// @access  Private (Staff/Manager/Admin)
router.put('/:id/inventory', auth, async (req, res) => {
  try {
    const { variantId, quantity, type, notes } = req.body; // type: 'add', 'remove', 'set'
    
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    // Check store access
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      if (!req.user.storeAccess.includes(product.store.toString())) {
        return res.status(403).json({
          message: 'Access denied'
        });
      }
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({
        message: 'Variant not found'
      });
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
        return res.status(400).json({
          message: 'Invalid inventory update type'
        });
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
      notes,
      updatedBy: req.user._id
    });

    product.updatedBy = req.user._id;
    product.updatedAt = new Date();

    await product.save();

    res.json({
      message: 'Inventory updated successfully',
      variant,
      inventoryLog: product.inventoryLogs[product.inventoryLogs.length - 1]
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
