const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const dayjs = require('dayjs');

// ✅ Ping check
router.get('/ping', (req, res) => {
  res.json({ message: 'Stock route working!' });
});

// ✅ Add New Stock
router.post('/', async (req, res) => {
  try {
    const today = dayjs().format('DDMMYY');
    const incoming = req.body.items || [];

    const finalItems = incoming.map(item => {
      const vendorNick = (item.vendorNick || 'VEN').substring(0, 3).toUpperCase();
      const typeCode = (item.type || 'XX').substring(0, 2).toUpperCase();
      const size = (item.size || 'NA').toUpperCase();
      const randomId = Math.floor(100000 + Math.random() * 900000); // 6-digit
      const sku = `${vendorNick}-${typeCode}-${size}-${randomId}-${today}`;

      const basePrice = Number(item.basePrice);
      const markup = Number(item.markupPercent);
      const sellingPrice = Math.round(basePrice + (basePrice * markup / 100));

      return {
        name: `${item.type} - ${item.size}`,
        sku,
        qrCode: sku,
        type: item.type,
        size: item.size,
        color: item.color,
        vendor: {
          vendorId: item.vendorId,
          vendorNick: vendorNick
        },
        pricing: {
          basePrice,
          markupPercentage: markup,
          sellingPrice
        },
        stock: {
          quantity: item.quantity,
          statusList: Array(item.quantity).fill().map(() => ({
            instock: true,
            soldDate: null,
            sku
          }))
        },
        isActive: true
      };
    });

    const result = await Product.insertMany(finalItems);
    res.status(201).json({ message: 'Stock added successfully', data: result });

  } catch (err) {
    console.error('❌ Add stock failed:', err);
    res.status(500).json({ message: 'Failed to add stock', error: err.message });
  }
});

// ✅ Get All Stock
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('vendor.vendorId', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stock', error: err.message });
  }
});

// ✅ Get One Product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('vendor.vendorId', 'name');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch product', error: err.message });
  }
});

// ✅ Edit Product
router.put('/:id', async (req, res) => {
  try {
    const update = req.body;

    if (update.pricing?.basePrice && update.pricing?.markupPercentage) {
      const bp = update.pricing.basePrice;
      const mp = update.pricing.markupPercentage;
      update.pricing.sellingPrice = Math.round(bp + (bp * mp / 100));
    }

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    res.json({ message: 'Product updated', product });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update product', error: err.message });
  }
});

// ✅ Restock Product
router.put('/restock/:id', async (req, res) => {
  try {
    const { addedQuantity } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.stock.quantity += addedQuantity;

    const newStatusList = Array(addedQuantity).fill().map(() => ({
      instock: true,
      soldDate: null,
      sku: product.sku
    }));

    product.stock.statusList.push(...newStatusList);

    await product.save();
    res.json({ message: 'Restocked successfully', product });

  } catch (err) {
    res.status(500).json({ message: 'Failed to restock', error: err.message });
  }
});

// ✅ Sell Product
router.put('/sell/:id', async (req, res) => {
  try {
    const { soldQuantity } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const inStockUnits = product.stock.statusList.filter(u => u.instock);
    if (inStockUnits.length < soldQuantity) {
      return res.status(400).json({ message: 'Not enough items in stock' });
    }

    let count = 0;
    for (let unit of product.stock.statusList) {
      if (unit.instock && count < soldQuantity) {
        unit.instock = false;
        unit.soldDate = new Date();
        count++;
      }
    }

    await product.save();
    res.json({ message: 'Sale recorded', product });

  } catch (err) {
    res.status(500).json({ message: 'Failed to record sale', error: err.message });
  }
});

module.exports = router;
