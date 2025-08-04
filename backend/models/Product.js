const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },

  sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
  qrCode: { type: String, unique: true, sparse: true, trim: true },

  type: {
    type: String,
    required: true,
    enum: [
      'Kurti', 'Saree', 'Lehenga', 'Dress', 'Top', 'Bottom',
      'Dupatta', 'Accessories', 'Nighty', 'Chudidar', 'Blouse', 'Other'
    ]
  },

  size: {
    type: String,
    required: true,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size', 'Custom']
  },

  color: { type: String, required: true, trim: true },

  vendor: {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true
    },
    vendorNick: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    }
  },

  pricing: {
    basePrice: { type: Number, required: true, min: 0 },
    markupPercentage: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 }
  },

  stock: {
    quantity: { type: Number, required: true, min: 0 },
    statusList: [{
      instock: { type: Boolean, default: true },
      soldDate: { type: Date },
      sku: { type: String, required: true }
    }]
  },

  isActive: { type: Boolean, default: true }

}, { timestamps: true });

productSchema.index({ sku: 1 });
productSchema.index({ 'vendor.vendorId': 1 });
productSchema.index({ name: 'text' });

module.exports = mongoose.model('Product', productSchema);
