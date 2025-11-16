const AppUpdate = require('../models/AppUpdate');
const User = require('../models/User');
const { shouldShowUpdate } = require('../utils/versionCompare');

// Get current app update status for mobile app
const getAppUpdateStatus = async (req, res) => {
  try {
    // Get client version and platform from query params
    const clientVersion = req.query.version || '1.0.0';
    const platform = req.query.platform || 'android'; // 'android' or 'ios'

    // Find the latest active update
    const update = await AppUpdate.findOne({
      isActive: true
    }).sort({ releaseDate: -1 });

    if (!update) {
      return res.json({
        success: true,
        data: {
          hasUpdate: false,
          update: null
        }
      });
    }

    // Check if client version should see this update
    const shouldShow = shouldShowUpdate(
      clientVersion,
      update.currentVersion,
      update.minVersion,
      update.maxVersion
    );

    // If client shouldn't see the update, return no update
    if (!shouldShow) {
      return res.json({
        success: true,
        data: {
          hasUpdate: false,
          update: null
        }
      });
    }

    // If urgency is 'none', don't show update
    if (update.urgency === 'none') {
      return res.json({
        success: true,
        data: {
          hasUpdate: false,
          update: null
        }
      });
    }

    // Determine store URL based on platform
    const storeUrl = platform.toLowerCase() === 'ios' 
      ? (update.appStoreUrl || update.playStoreUrl) 
      : update.playStoreUrl;

    // Return the update
    res.json({
      success: true,
      data: {
        hasUpdate: true,
        update: {
          title: update.title,
          description: update.description,
          urgency: update.urgency,
          features: update.features || [],
          bugFixes: update.bugFixes || [],
          playStoreUrl: storeUrl,
          appStoreUrl: update.appStoreUrl || storeUrl,
          releaseDate: update.releaseDate
        }
      }
    });
  } catch (error) {
    console.error('Error getting app update status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all app updates (admin)
const getAllAppUpdates = async (req, res) => {
  try {
    const updates = await AppUpdate.find()
      .populate('createdBy', 'firstName lastName email')
      .sort({ releaseDate: -1 });

    res.json({
      success: true,
      data: updates
    });
  } catch (error) {
    console.error('Error getting app updates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create new app update (admin)
const createAppUpdate = async (req, res) => {
  try {
    const {
      title,
      description,
      urgency,
      features,
      bugFixes,
      playStoreUrl,
      appStoreUrl,
      currentVersion,
      minVersion,
      maxVersion
    } = req.body;

    // Validate required fields
    if (!title || !description || !playStoreUrl || !currentVersion) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, description, playStoreUrl, and currentVersion are required'
      });
    }

    // Validate version format (basic check)
    const versionPattern = /^\d+\.\d+\.\d+$/;
    if (!versionPattern.test(currentVersion)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid currentVersion format. Use semantic versioning (e.g., 1.0.0)'
      });
    }

    if (minVersion && !versionPattern.test(minVersion)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid minVersion format. Use semantic versioning (e.g., 1.0.0)'
      });
    }

    if (maxVersion && !versionPattern.test(maxVersion)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid maxVersion format. Use semantic versioning (e.g., 1.0.0)'
      });
    }

    const update = new AppUpdate({
      title,
      description,
      urgency: urgency || 'none',
      features: features || [],
      bugFixes: bugFixes || [],
      playStoreUrl,
      appStoreUrl: appStoreUrl || '',
      currentVersion,
      minVersion: minVersion || null,
      maxVersion: maxVersion || null,
      createdBy: req.user.id
    });

    await update.save();

    res.status(201).json({
      success: true,
      data: update,
      message: 'App update created successfully'
    });
  } catch (error) {
    console.error('Error creating app update:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationMessages = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        message: validationMessages.join('. ')
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An update with similar details already exists'
      });
    }
    
    // Return more detailed error in development, generic in production
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? (error.message || 'Internal server error')
        : 'Internal server error. Please try again later.'
    });
  }
};

// Update app update (admin)
const updateAppUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const update = await AppUpdate.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email');

    if (!update) {
      return res.status(404).json({
        success: false,
        message: 'App update not found'
      });
    }

    res.json({
      success: true,
      data: update,
      message: 'App update updated successfully'
    });
  } catch (error) {
    console.error('Error updating app update:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationMessages = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        message: validationMessages.join('. ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? (error.message || 'Internal server error')
        : 'Internal server error. Please try again later.'
    });
  }
};

// Delete app update (admin)
const deleteAppUpdate = async (req, res) => {
  try {
    const { id } = req.params;

    const update = await AppUpdate.findByIdAndDelete(id);

    if (!update) {
      return res.status(404).json({
        success: false,
        message: 'App update not found'
      });
    }

    res.json({
      success: true,
      message: 'App update deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting app update:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? (error.message || 'Internal server error')
        : 'Internal server error. Please try again later.'
    });
  }
};

// Toggle app update status (admin)
const toggleAppUpdateStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const update = await AppUpdate.findById(id);
    if (!update) {
      return res.status(404).json({
        success: false,
        message: 'App update not found'
      });
    }

    update.isActive = !update.isActive;
    await update.save();

    res.json({
      success: true,
      data: update,
      message: `App update ${update.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling app update status:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? (error.message || 'Internal server error')
        : 'Internal server error. Please try again later.'
    });
  }
};

module.exports = {
  getAppUpdateStatus,
  getAllAppUpdates,
  createAppUpdate,
  updateAppUpdate,
  deleteAppUpdate,
  toggleAppUpdateStatus
};
