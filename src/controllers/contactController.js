const Contact = require('../models/Contact');

// Submit contact form
exports.submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Please fill in all required fields',
      });
    }

    // Create contact entry
    const contact = await Contact.create({
      name,
      email,
      phone,
      subject,
      message,
    });

    res.status(201).json({
      status: 'success',
      message: 'Your message has been submitted successfully. We will get back to you soon!',
      data: {
        contact: {
          id: contact._id,
          name: contact.name,
          email: contact.email,
          subject: contact.subject,
          createdAt: contact.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error submitting your message. Please try again later.',
      error: error.message,
    });
  }
};

// Get all contact submissions (admin only)
exports.getAllContacts = async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 10, search } = req.query;
    
    // Build filter object
    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (priority) {
      filter.priority = priority;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get contacts with pagination
    const contacts = await Contact.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Contact.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        contacts,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching contact submissions',
      error: error.message,
    });
  }
};

// Get single contact (admin only)
exports.getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact submission not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        contact,
      },
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching contact submission',
      error: error.message,
    });
  }
};

// Update contact status (admin only)
exports.updateContactStatus = async (req, res) => {
  try {
    const { status, priority, adminNotes } = req.body;
    const contactId = req.params.id;

    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const contact = await Contact.findByIdAndUpdate(
      contactId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact submission not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Contact status updated successfully',
      data: {
        contact,
      },
    });
  } catch (error) {
    console.error('Error updating contact status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating contact status',
      error: error.message,
    });
  }
};

// Delete contact (admin only)
exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact submission not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Contact submission deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting contact submission',
      error: error.message,
    });
  }
};

// Get contact statistics (admin only)
exports.getContactStats = async (req, res) => {
  try {
    const stats = await Contact.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const priorityStats = await Contact.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalContacts = await Contact.countDocuments();
    const recentContacts = await Contact.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalContacts,
        recentContacts,
        statusBreakdown: stats,
        priorityBreakdown: priorityStats,
      },
    });
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching contact statistics',
      error: error.message,
    });
  }
};
