const mongoose = require('mongoose');

const appUpdateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  urgency: {
    type: String,
    enum: ['none', 'optional', 'critical'],
    default: 'none'
  },
  features: [{
    title: String,
    description: String
  }],
  bugFixes: [{
    title: String,
    description: String
  }],
  // Version control fields
  currentVersion: {
    type: String,
    required: true,
    default: '1.0.0',
    description: 'The latest version - users with this version will NOT see the update modal'
  },
  minVersion: {
    type: String,
    required: false,
    description: 'Minimum version that should see this update (inclusive). If not set, all versions below currentVersion will see it.'
  },
  maxVersion: {
    type: String,
    required: false,
    description: 'Maximum version that should see this update (exclusive). Versions below this but not equal to currentVersion will see it.'
  },
  // Store URLs
  playStoreUrl: {
    type: String,
    required: true,
    description: 'Google Play Store URL for Android'
  },
  appStoreUrl: {
    type: String,
    required: false,
    description: 'Apple App Store URL for iOS'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  releaseDate: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AppUpdate', appUpdateSchema);
