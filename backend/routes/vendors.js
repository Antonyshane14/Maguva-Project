const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const { auth, authorize } = require('../middleware/auth');

// @POST /api/vendors — Add vendor
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const vendor = new Vendor({ ...req.body, createdBy: req.user._id });
    await vendor.save();
    res.status(201).json({ message: 'Vendor registered', vendor });
  } catch (error) {
    res.status(500).json({ message: 'Error creating vendor', error: error.message });
  }
});

// @GET /api/vendors — Get all vendors
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendors', error: error.message });
  }
});

// @GET /api/vendors/:id — Get single vendor
router.get('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving vendor', error: error.message });
  }
});

// @PUT /api/vendors/:id — Update vendor
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const updated = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ message: 'Vendor updated', vendor: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating vendor', error: error.message });
  }
});

// @DELETE /api/vendors/:id — Delete vendor
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const deleted = await Vendor.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ message: 'Vendor deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting vendor', error: error.message });
  }
});

module.exports = router;
