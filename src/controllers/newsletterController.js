const Newsletter = require('../models/Newsletter');

// Subscribe to newsletter
exports.subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email address is required',
      });
    }

    // Check if email already exists
    const existingSubscription = await Newsletter.findOne({ email });

    if (existingSubscription) {
      if (existingSubscription.isActive) {
        return res.status(400).json({
          status: 'error',
          message: 'This email is already subscribed to our newsletter',
        });
      } else {
        // Reactivate subscription
        existingSubscription.isActive = true;
        existingSubscription.subscribedAt = new Date();
        existingSubscription.unsubscribedAt = undefined;
        await existingSubscription.save();

        return res.status(200).json({
          status: 'success',
          message: 'Welcome back! You have been resubscribed to our newsletter.',
          data: {
            email: existingSubscription.email,
            subscribedAt: existingSubscription.subscribedAt,
          },
        });
      }
    }

    // Create new subscription
    const newsletter = await Newsletter.create({
      email,
      source: 'website',
    });

    res.status(201).json({
      status: 'success',
      message: 'Thank you for subscribing to our newsletter! You will receive updates about our latest news and features.',
      data: {
        email: newsletter.email,
        subscribedAt: newsletter.subscribedAt,
      },
    });
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error subscribing to newsletter. Please try again later.',
      error: error.message,
    });
  }
};

// Unsubscribe from newsletter
exports.unsubscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email address is required',
      });
    }

    const newsletter = await Newsletter.findOne({ email });

    if (!newsletter) {
      return res.status(404).json({
        status: 'error',
        message: 'Email not found in our newsletter list',
      });
    }

    if (!newsletter.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'This email is already unsubscribed from our newsletter',
      });
    }

    newsletter.isActive = false;
    newsletter.unsubscribedAt = new Date();
    await newsletter.save();

    res.status(200).json({
      status: 'success',
      message: 'You have been successfully unsubscribed from our newsletter.',
    });
  } catch (error) {
    console.error('Error unsubscribing from newsletter:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error unsubscribing from newsletter. Please try again later.',
      error: error.message,
    });
  }
};

// Get all newsletter subscribers (admin only)
exports.getAllSubscribers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status = 'active' } = req.query;
    
    // Build filter object
    const filter = {};
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }
    
    if (search) {
      filter.email = { $regex: search, $options: 'i' };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get subscribers with pagination
    const subscribers = await Newsletter.find(filter)
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Newsletter.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        subscribers,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching newsletter subscribers:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching newsletter subscribers',
      error: error.message,
    });
  }
};

// Get newsletter statistics (admin only)
exports.getNewsletterStats = async (req, res) => {
  try {
    const totalSubscribers = await Newsletter.countDocuments({ isActive: true });
    const totalUnsubscribed = await Newsletter.countDocuments({ isActive: false });
    const newSubscribersThisMonth = await Newsletter.countDocuments({
      isActive: true,
      subscribedAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    });

    const subscribersThisWeek = await Newsletter.countDocuments({
      isActive: true,
      subscribedAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalSubscribers,
        totalUnsubscribed,
        newSubscribersThisMonth,
        subscribersThisWeek,
      },
    });
  } catch (error) {
    console.error('Error fetching newsletter stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching newsletter statistics',
      error: error.message,
    });
  }
};

// Delete subscriber (admin only)
exports.deleteSubscriber = async (req, res) => {
  try {
    const subscriber = await Newsletter.findByIdAndDelete(req.params.id);

    if (!subscriber) {
      return res.status(404).json({
        status: 'error',
        message: 'Subscriber not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Subscriber deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting subscriber',
      error: error.message,
    });
  }
};
