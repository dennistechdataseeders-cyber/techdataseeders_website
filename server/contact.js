const { getSubmissions, saveSubmission, updateSubmissionStatus } = require('./db');
const { sendContactEmail } = require('../utils/email');

// Phone number validation - supports international formats
function validatePhone(phone) {
  if (!phone) return true; // Phone is optional
  
  // Remove all spaces, dashes, dots, parentheses, and plus sign for validation
  const cleaned = phone.replace(/[\s\-\.\(\)\+]/g, '');
  
  // Check if it contains only digits
  if (!/^\d+$/.test(cleaned)) {
    return false;
  }
  
  const length = cleaned.length;
  
  // MINIMUM: 9 digits (most countries have 9-11 digits)
  // MAXIMUM: 15 digits (ITU-T international standard)
  if (length < 9 || length > 15) {
    return false;
  }
  
  return true;
}

// Format phone number for display
function formatPhone(phone) {
  if (!phone) return 'Not provided';
  
  // Remove all non-digit characters except plus
  const cleaned = phone.replace(/[^\d\+]/g, '');
  
  // If it starts with +, keep it as is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Format US numbers: (XXX) XXX-XXXX (10 digits)
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Format US numbers with 1 + 10 digits: +1 (XXX) XXX-XXXX
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  // Format Indian numbers: +91 XXXXX XXXXX (10 digits)
  if (cleaned.length === 10 && !cleaned.startsWith('1')) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  // For UK numbers: 020 7946 0123 (11 digits starting with 0)
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
  }
  
  // For other lengths, group in 3s
  if (cleaned.length > 4) {
    const groups = [];
    let remaining = cleaned;
    while (remaining.length > 4) {
      groups.push(remaining.slice(0, 3));
      remaining = remaining.slice(3);
    }
    if (remaining) groups.push(remaining);
    return groups.join(' ');
  }
  
  return cleaned;
}

async function submitContact(req, res) {
  try {
    const { name, email, phone, message } = req.body;
    
    console.log('📩 Received form submission:', { name, email, phone });
    
    // Validate
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address'
      });
    }
    
    // Validate phone if provided
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number (minimum 9 digits)'
      });
    }
    
    // Save submission to database
    const submissionData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? formatPhone(phone.trim()) : '',
      message: message ? message.trim() : '',
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || ''
    };
    
    const submission = await saveSubmission(submissionData);
    console.log(`💾 Submission saved to MongoDB (ID: ${submission._id})`);
    
    // Send email notification
    console.log('📧 Sending email notification...');
    const emailResult = await sendContactEmail(submissionData);
    
    if (emailResult.success) {
      console.log('✅ Email notification sent successfully');
    } else {
      console.warn('⚠️ Email notification failed:', emailResult.error);
    }
    
    res.json({
      success: true,
      message: 'Form submitted successfully!',
      data: { name, email }
    });
  } catch (error) {
    console.error('❌ Error in submitContact:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error. Please try again later.'
    });
  }
}

async function getAllSubmissions(req, res) {
  try {
    const submissions = await getSubmissions();
    res.json({ success: true, data: submissions });
  } catch (error) {
    console.error('Error in getAllSubmissions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateSubmission(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['new', 'read', 'replied', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: new, read, replied, or archived'
      });
    }
    
    const submission = await updateSubmissionStatus(id, status);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Status updated',
      data: submission
    });
  } catch (error) {
    console.error('Error in updateSubmission:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  submitContact,
  getAllSubmissions,
  updateSubmission,
  validatePhone,
  formatPhone
};