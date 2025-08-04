const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// ✅ Add New Stock - POST /api/stock
router.post('/stock', async (req, res) => {
  try {
    const {
      vendor,
      quantity,
      size,
      type,
      color,
      priceBase,
      priceMarkup
    } = req.body;

    const priceFinal = priceBase + (priceBase * (priceMarkup / 100));

    const product = new Product({
      vendor,
      quantity,
      inStock: quantity,
      size,
      type,
      color,
      priceBase,
      priceMarkup,
      priceFinal
    });

    await product.save();
    res.status(201).json({ message: 'Stock added successfully', product });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add stock', error: err.message });
  }
});

// ✅ Get All Stock - GET /api/stock
router.get('/stock', async (req, res) => {
  try {
    const products = await Product.find().populate('vendor', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stock', error: err.message });
  }
});

// ✅ Get One Stock - GET /api/stock/:id
router.get('/stock/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('vendor', 'name');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch product', error: err.message });
  }
});

// ✅ Edit Stock - PUT /api/stock/:id
router.put('/stock/:id', async (req, res) => {
  try {
    const update = req.body;
    if (update.priceMarkup && update.priceBase) {
      update.priceFinal = update.priceBase + (update.priceBase * (update.priceMarkup / 100));
    }

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    res.json({ message: 'Product updated', product });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update product', error: err.message });
  }
});

// ✅ Restock - PUT /api/restock/:id
router.put('/restock/:id', async (req, res) => {
  try {
    const { addedQuantity } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.quantity += addedQuantity;
    product.inStock += addedQuantity;

    await product.save();
    res.json({ message: 'Restocked successfully', product });
  } catch (err) {
    res.status(500).json({ message: 'Failed to restock', error: err.message });
  }
});

// ✅ Sell - PUT /api/sell/:id
router.put('/sell/:id', async (req, res) => {
  try {
    const { soldQuantity } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.inStock < soldQuantity) {
      return res.status(400).json({ message: 'Not enough stock available' });
    }

    product.inStock -= soldQuantity;

    await product.save();
    res.json({ message: 'Stock updated after sale', product });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update stock after sale', error: err.message });
  }
});

module.exports = router;
