const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  contactPerson: { type: String },
  phone: { type: String },
  email: { type: String, lowercase: true, trim: true },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true
});

module.exports = mongoose.model('Vendor', vendorSchema);
