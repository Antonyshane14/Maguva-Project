const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const { auth } = require('../middleware/auth');
const router = express.Router();

// @route   POST /api/payments/create-payment-intent
// @desc    Create Stripe payment intent
// @access  Private
router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    const { orderId, amount, currency = 'inr' } = req.body;

    // Validate order
    const order = await Order.findById(orderId);
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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to smallest currency unit (paise for INR)
      currency,
      metadata: {
        orderId: orderId,
        userId: req.user._id.toString(),
        storeId: order.store.toString()
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      message: 'Error creating payment intent',
      error: error.message
    });
  }
});

// @route   POST /api/payments/confirm-payment
// @desc    Confirm payment and update order
// @access  Private
router.post('/confirm-payment', auth, async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        message: 'Payment not successful',
        status: paymentIntent.status
      });
    }

    // Find and update order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    // Check if payment already processed
    const existingPayment = order.payments.find(
      p => p.reference === paymentIntentId
    );
    if (existingPayment) {
      return res.status(400).json({
        message: 'Payment already processed'
      });
    }

    // Add payment to order
    const paymentAmount = paymentIntent.amount / 100; // Convert from paise to rupees
    order.payments.push({
      method: 'card',
      amount: paymentAmount,
      reference: paymentIntentId,
      status: 'completed',
      processedBy: req.user._id,
      processedAt: new Date(),
      notes: `Stripe payment - ${paymentIntent.charges.data[0]?.payment_method_details?.card?.brand} ending in ${paymentIntent.charges.data[0]?.payment_method_details?.card?.last4}`
    });

    // Update payment status
    const totalPaid = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
    if (totalPaid >= order.totals.grandTotal) {
      order.paymentStatus = 'paid';
    } else {
      order.paymentStatus = 'partial';
    }

    order.updatedBy = req.user._id;
    order.updatedAt = new Date();

    await order.save();

    res.json({
      message: 'Payment confirmed successfully',
      payment: order.payments[order.payments.length - 1],
      paymentStatus: order.paymentStatus
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      message: 'Error confirming payment',
      error: error.message
    });
  }
});

// @route   POST /api/payments/webhook
// @desc    Stripe webhook for payment events
// @access  Public (Stripe webhook)
router.post('/webhook', async (req, res) => {
  let event;

  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);
      
      // Update order if not already updated
      if (paymentIntent.metadata.orderId) {
        try {
          const order = await Order.findById(paymentIntent.metadata.orderId);
          if (order) {
            const existingPayment = order.payments.find(
              p => p.reference === paymentIntent.id
            );
            
            if (!existingPayment) {
              const paymentAmount = paymentIntent.amount / 100;
              order.payments.push({
                method: 'card',
                amount: paymentAmount,
                reference: paymentIntent.id,
                status: 'completed',
                processedAt: new Date(),
                notes: 'Stripe webhook confirmation'
              });

              const totalPaid = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
              if (totalPaid >= order.totals.grandTotal) {
                order.paymentStatus = 'paid';
              } else {
                order.paymentStatus = 'partial';
              }

              await order.save();
            }
          }
        } catch (error) {
          console.error('Error updating order from webhook:', error);
        }
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      
      // Log failed payment
      if (failedPayment.metadata.orderId) {
        try {
          const order = await Order.findById(failedPayment.metadata.orderId);
          if (order) {
            order.payments.push({
              method: 'card',
              amount: failedPayment.amount / 100,
              reference: failedPayment.id,
              status: 'failed',
              processedAt: new Date(),
              notes: `Payment failed: ${failedPayment.last_payment_error?.message || 'Unknown error'}`
            });
            await order.save();
          }
        } catch (error) {
          console.error('Error logging failed payment:', error);
        }
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// @route   POST /api/payments/cash
// @desc    Process cash payment
// @access  Private
router.post('/cash', auth, async (req, res) => {
  try {
    const { orderId, amount, received, notes } = req.body;

    const order = await Order.findById(orderId);
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

    const change = received - amount;
    if (change < 0) {
      return res.status(400).json({
        message: 'Insufficient cash received'
      });
    }

    // Add payment
    order.payments.push({
      method: 'cash',
      amount,
      received,
      change,
      status: 'completed',
      processedBy: req.user._id,
      processedAt: new Date(),
      notes
    });

    // Update payment status
    const totalPaid = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
    if (totalPaid >= order.totals.grandTotal) {
      order.paymentStatus = 'paid';
    } else {
      order.paymentStatus = 'partial';
    }

    order.updatedBy = req.user._id;
    order.updatedAt = new Date();

    await order.save();

    res.json({
      message: 'Cash payment processed successfully',
      payment: order.payments[order.payments.length - 1],
      change,
      paymentStatus: order.paymentStatus
    });
  } catch (error) {
    console.error('Process cash payment error:', error);
    res.status(500).json({
      message: 'Error processing cash payment',
      error: error.message
    });
  }
});

// @route   POST /api/payments/upi
// @desc    Process UPI payment
// @access  Private
router.post('/upi', auth, async (req, res) => {
  try {
    const { orderId, amount, upiId, transactionId, notes } = req.body;

    const order = await Order.findById(orderId);
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

    // Add payment
    order.payments.push({
      method: 'upi',
      amount,
      reference: transactionId,
      status: 'completed',
      processedBy: req.user._id,
      processedAt: new Date(),
      notes: `UPI Payment - ${upiId}${notes ? ` | ${notes}` : ''}`
    });

    // Update payment status
    const totalPaid = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
    if (totalPaid >= order.totals.grandTotal) {
      order.paymentStatus = 'paid';
    } else {
      order.paymentStatus = 'partial';
    }

    order.updatedBy = req.user._id;
    order.updatedAt = new Date();

    await order.save();

    res.json({
      message: 'UPI payment processed successfully',
      payment: order.payments[order.payments.length - 1],
      paymentStatus: order.paymentStatus
    });
  } catch (error) {
    console.error('Process UPI payment error:', error);
    res.status(500).json({
      message: 'Error processing UPI payment',
      error: error.message
    });
  }
});

// @route   GET /api/payments/methods
// @desc    Get available payment methods
// @access  Private
router.get('/methods', auth, async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: 'cash',
        name: 'Cash',
        description: 'Cash payment',
        enabled: true,
        fees: 0
      },
      {
        id: 'card',
        name: 'Card',
        description: 'Credit/Debit Card (via Stripe)',
        enabled: !!process.env.STRIPE_SECRET_KEY,
        fees: 2.9 // 2.9% + ₹3
      },
      {
        id: 'upi',
        name: 'UPI',
        description: 'UPI Payment',
        enabled: true,
        fees: 0
      },
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        description: 'Direct bank transfer',
        enabled: true,
        fees: 0
      }
    ];

    res.json({
      paymentMethods: paymentMethods.filter(method => method.enabled)
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      message: 'Error fetching payment methods',
      error: error.message
    });
  }
});

// @route   GET /api/payments/transactions
// @desc    Get payment transactions with filters
// @access  Private (Manager/Admin)
router.get('/transactions', auth, async (req, res) => {
  try {
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.method) {
      filter['payments.method'] = req.query.method;
    }

    if (req.query.status) {
      filter['payments.status'] = req.query.status;
    }

    if (req.query.startDate || req.query.endDate) {
      filter['payments.processedAt'] = {};
      if (req.query.startDate) filter['payments.processedAt'].$gte = new Date(req.query.startDate);
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate);
        endDate.setHours(23, 59, 59, 999);
        filter['payments.processedAt'].$lte = endDate;
      }
    }

    // Store access control
    if (req.user.role !== 'admin' && req.user.storeAccess?.length > 0) {
      filter.store = { $in: req.user.storeAccess };
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name email phone')
      .populate('store', 'name location')
      .populate('payments.processedBy', 'username profile.firstName profile.lastName')
      .sort({ 'payments.processedAt': -1 })
      .skip(skip)
      .limit(limit);

    // Flatten payments with order details
    const transactions = [];
    orders.forEach(order => {
      order.payments.forEach(payment => {
        transactions.push({
          _id: payment._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          customer: order.customer,
          store: order.store,
          payment,
          createdAt: payment.processedAt
        });
      });
    });

    // Sort by payment date
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      transactions: transactions.slice(0, limit),
      pagination: {
        page,
        limit,
        total: transactions.length
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      message: 'Error fetching transactions',
      error: error.message
    });
  }
});

module.exports = router;
