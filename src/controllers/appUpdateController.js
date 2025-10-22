const AppUpdate = require('../models/AppUpdate');
const User = require('../models/User');

// Get current app update status for mobile app
const getAppUpdateStatus = async (req, res) => {
  try {
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

    // Return the update based on urgency
    res.json({
      success: true,
      data: {
        hasUpdate: update.urgency !== 'none',
        update: {
          title: update.title,
          description: update.description,
          urgency: update.urgency,
          features: update.features,
          bugFixes: update.bugFixes,
          playStoreUrl: update.playStoreUrl,
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
      playStoreUrl
    } = req.body;

    // Validate required fields
    if (!title || !description || !playStoreUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const update = new AppUpdate({
      title,
      description,
      urgency: urgency || 'none',
      features: features || [],
      bugFixes: bugFixes || [],
      playStoreUrl,
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
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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
      message: 'Internal server error'
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
      message: 'Internal server error'
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
