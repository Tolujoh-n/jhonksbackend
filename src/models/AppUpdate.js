const mongoose = require('mongoose');

const appUpdateSchema = new mongoose.Schema({
  version: {
    type: String,
    required: true,
    unique: true
  },
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
  playStoreUrl: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  minVersion: {
    type: String,
    required: true
  },
  maxVersion: {
    type: String,
    required: true
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
