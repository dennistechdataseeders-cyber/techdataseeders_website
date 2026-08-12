const nodemailer = require('nodemailer');
require('dotenv').config();

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
  if (cleaned.length === 10 && !cleaned.startsWith('1') && !cleaned.startsWith('0')) {
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

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  }
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP connection error:', error.message);
    console.log('💡 Check your .env SMTP settings');
  } else {
    console.log('✅ Email service ready (Zoho)');
  }
});

/**
 * Send contact form notification email
 */
async function sendContactEmail(data) {
  const { name, email, phone, message, ip, userAgent } = data;
  
  // Format phone for display
  const formattedPhone = formatPhone(phone);
  
  // Get recipient from .env or use default
  const recipient = process.env.CONTACT_EMAIL || 'sales@techdataseeders.com';
  
  const mailOptions = {
    from: process.env.SMTP_FROM ,
    to: recipient,
    replyTo: email,
    subject: `📩 New Contact Form Submission from ${name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563FF; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .field { margin-bottom: 16px; }
          .label { font-weight: 600; color: #374151; }
          .value { color: #1f2937; padding: 8px 12px; background: white; border-radius: 4px; border: 1px solid #e5e7eb; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📩 New Contact Form Submission</h2>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">👤 Name:</div>
              <div class="value">${name}</div>
            </div>
            <div class="field">
              <div class="label">📧 Email:</div>
              <div class="value"><a href="mailto:${email}">${email}</a></div>
            </div>
            <div class="field">
              <div class="label">📞 Phone:</div>
              <div class="value">${formattedPhone}</div>
            </div>
            <div class="field">
              <div class="label">💬 Message:</div>
              <div class="value" style="white-space: pre-wrap;">${message || 'No message provided'}</div>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <div class="field">
              <div class="label">🌐 IP Address:</div>
              <div class="value">${ip || 'Unknown'}</div>
            </div>
            <div class="field">
              <div class="label">🖥️ User Agent:</div>
              <div class="value" style="font-size: 12px; word-break: break-all;">${userAgent || 'Unknown'}</div>
            </div>
            <div class="field">
              <div class="label">📅 Submitted:</div>
              <div class="value">${new Date().toLocaleString()}</div>
            </div>
          </div>
          <div class="footer">
            <p>This email was sent from your Techdataseeders website contact form.</p>
            <p>To view all submissions, visit the <a href="https://techdataseeders.in/admin">Admin Panel</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      New Contact Form Submission
      -------------------------
      Name: ${name}
      Email: ${email}
      Phone: ${formattedPhone}
      Message: ${message || 'No message provided'}
      IP: ${ip || 'Unknown'}
      Submitted: ${new Date().toLocaleString()}
      
      View all submissions in the admin panel.
    `
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${recipient}: ${info.messageId}`);
    return { success: true, messageId: info.messageId, recipient };
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { sendContactEmail };