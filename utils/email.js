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
    console.error('SMTP connection error:', error.message);
    console.log('Check your .env SMTP settings');
  } else {
    console.log('Email service ready');
  }
});

/**
 * Send contact form notification email
 */
async function sendContactEmail(data) {
  const { name, email, phone, message } = data;
  
  // Format phone for display
  const formattedPhone = formatPhone(phone);
  
  // Get recipient from .env or use default
  const recipient = 'sales@techdataseeders.com';
  
  // Get current date/time in a professional format
  const submittedDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: recipient,
    bcc: 'kleverishoffical@gmail.com',
    replyTo: email,
    subject: `New Contact Form Submission from ${name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a2e;
            background-color: #f8f9fa;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #1a237e 0%, #2563ff 100%);
            color: #ffffff;
            padding: 28px 32px;
          }
          .header h2 {
            margin: 0;
            font-size: 22px;
            font-weight: 600;
            letter-spacing: -0.3px;
          }
          .header p {
            margin: 6px 0 0;
            opacity: 0.8;
            font-size: 14px;
          }
          .content {
            padding: 32px;
          }
          .field {
            margin-bottom: 20px;
          }
          .field:last-child {
            margin-bottom: 0;
          }
          .label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: #4b5563;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .value {
            display: block;
            font-size: 16px;
            color: #1a1a2e;
            padding: 10px 14px;
            background: #f8f9fa;
            border-radius: 6px;
            border-left: 3px solid #2563ff;
            word-break: break-word;
          }
          .value a {
            color: #2563ff;
            text-decoration: none;
          }
          .value a:hover {
            text-decoration: underline;
          }
          .divider {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 24px 0;
          }
          .footer {
            text-align: center;
            padding: 20px 32px 28px;
            color: #6b7280;
            font-size: 13px;
            border-top: 1px solid #e5e7eb;
            background: #fafbfc;
          }
          .footer p {
            margin: 4px 0;
          }
          .footer .brand {
            color: #1a237e;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Contact Form Submission</h2>
            <p>You have received a new inquiry from your website</p>
          </div>
          <div class="content">
            <div class="field">
              <span class="label">Name</span>
              <span class="value">${name}</span>
            </div>
            <div class="field">
              <span class="label">Email</span>
              <span class="value"><a href="mailto:${email}">${email}</a></span>
            </div>
            <div class="field">
              <span class="label">Phone</span>
              <span class="value">${formattedPhone}</span>
            </div>
            <hr class="divider">
            <div class="field">
              <span class="label">Message</span>
              <span class="value" style="white-space: pre-wrap; border-left-color: #6b7280;">${message || 'No message provided'}</span>
            </div>
            <hr class="divider">
            <div class="field">
              <span class="label">Submitted</span>
              <span class="value" style="border-left-color: #6b7280;">${submittedDate}</span>
            </div>
          </div>
          <div class="footer">
            <p>This email was sent from the Techdataseeders website contact form.</p>
            <p>— <span class="brand">Techdataseeders</span> —</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
NEW CONTACT FORM SUBMISSION
================================

Name:     ${name}
Email:    ${email}
Phone:    ${formattedPhone}

Message:
----------------------------------------
${message || 'No message provided'}
----------------------------------------

Submitted: ${submittedDate}

--
This email was sent from the Techdataseeders website contact form.
Techdataseeders
    `
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${recipient} (BCC: kleverishoffical@gmail.com): ${info.messageId}`);
    return { success: true, messageId: info.messageId, recipient };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send OTP verification email for chat widget
 */
async function sendOtpEmail({ email, otp }) {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: `Your Techdataseeders Verification Code: ${otp}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a2e;
            background-color: #f8f9fa;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 500px;
            margin: 24px auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
            overflow: hidden;
            border-top: 4px solid #2563ff;
          }
          .header {
            background: #ffffff;
            padding: 32px 32px 20px;
            text-align: center;
            border-bottom: 1px solid #f1f5f9;
          }
          .header-logo {
            max-width: 260px;
            width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
          }
          .content {
            padding: 32px 28px;
            text-align: center;
          }
          .intro-text {
            font-size: 15px;
            color: #4b5563;
            margin: 0 0 20px;
          }
          .otp-code {
            display: inline-block;
            font-family: 'Courier New', Courier, monospace;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 8px;
            color: #2563ff;
            background: #f0f4ff;
            padding: 14px 28px;
            border-radius: 8px;
            border: 1px dashed #2563ff;
            margin: 10px 0 20px;
          }
          .note {
            font-size: 13px;
            color: #888;
            margin: 0;
          }
          .footer {
            text-align: center;
            padding: 18px 24px;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            background: #fafbfc;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header" style="background: #ffffff; padding: 32px 32px 20px; text-align: center; border-bottom: 1px solid #f1f5f9;">
            <img src="https://res.cloudinary.com/dhcwcyqke/image/upload/v1779973871/image_1_1_c60r0l.png" alt="Techdataseeders" width="260" class="header-logo" style="max-width: 260px; width: 100%; height: auto; display: block; margin: 0 auto; border: 0;">
          </div>
          <div class="content">
            <p class="intro-text">Here is your one-time verification code to start chatting with the Techdataseeders Assistant:</p>
            <div class="otp-code">${otp}</div>
            <p class="note">This code will expire in 5 minutes. If you did not request this, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 Techdataseeders. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your Techdataseeders chat verification code is: ${otp}\n\nThis code will expire in 5 minutes.`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[chatbot] OTP email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[chatbot] OTP email send error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Format timestamp for chat transcript (e.g. "Oct 5, 2026 · 11:52 AM")
 */
function formatTranscriptTimestamp(date) {
  const d = date ? new Date(date) : new Date();
  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return `${dateStr} · ${timeStr}`;
}

/**
 * Escape HTML characters to prevent rendering issues in email clients
 */
function escapeTranscriptHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Send full chat transcript email after session inactivity
 */
async function sendChatTranscriptEmail({ to, identifier, messages }) {
  const safeIdentifier = escapeTranscriptHtml(identifier);
  const messageList = Array.isArray(messages) ? messages : [];

  const htmlMessages = messageList.map(msg => {
    const isUser = msg.role === 'user';
    const sender = isUser ? 'User' : 'Jenny (Techdataseeders)';
    const timestamp = formatTranscriptTimestamp(msg.createdAt);
    const content = escapeTranscriptHtml(msg.content).replace(/\n/g, '<br>');

    if (isUser) {
      return `
        <div style="margin-bottom: 18px; text-align: right;">
          <div style="display: inline-block; max-width: 80%; text-align: left; background: #2563ff; color: #ffffff; padding: 12px 16px; border-radius: 12px 12px 2px 12px; font-size: 14px; line-height: 1.5; word-break: break-word;">
            ${content}
          </div>
          <div style="font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #94a3b8; margin-top: 4px; padding-right: 4px;">
            ${sender} &bull; ${timestamp}
          </div>
        </div>
      `;
    } else {
      return `
        <div style="margin-bottom: 18px; text-align: left;">
          <div style="display: inline-block; max-width: 80%; text-align: left; background: #f8f9fa; color: #1a1a2e; padding: 12px 16px; border-radius: 12px 12px 12px 2px; font-size: 14px; line-height: 1.5; word-break: break-word; border-left: 3px solid #2563ff; border-top: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
            ${content}
          </div>
          <div style="font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #94a3b8; margin-top: 4px; padding-left: 4px;">
            ${sender} &bull; ${timestamp}
          </div>
        </div>
      `;
    }
  }).join('');

  const textMessages = messageList.map(msg => {
    const sender = msg.role === 'user' ? `User (${identifier})` : 'Jenny (Assistant)';
    const timestamp = formatTranscriptTimestamp(msg.createdAt);
    return `[${timestamp}] ${sender}:\n${msg.content}`;
  }).join('\n\n----------------------------------------\n\n');

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: to,
    subject: `Chat transcript: ${identifier} — Techdataseeders`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a2e;
            background-color: #f8f9fa;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #1a237e 0%, #2563ff 100%);
            color: #ffffff;
            padding: 28px 32px;
          }
          .header h2 {
            margin: 0;
            font-size: 22px;
            font-weight: 600;
            letter-spacing: -0.3px;
          }
          .header p {
            margin: 6px 0 0;
            opacity: 0.8;
            font-size: 14px;
          }
          .content {
            padding: 32px;
          }
          .footer {
            text-align: center;
            padding: 20px 32px 28px;
            color: #6b7280;
            font-size: 13px;
            border-top: 1px solid #e5e7eb;
            background: #fafbfc;
          }
          .footer p {
            margin: 4px 0;
          }
          .footer .brand {
            color: #1a237e;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Chat Transcript</h2>
            <p>User: ${safeIdentifier} &bull; ${messageList.length} message${messageList.length === 1 ? '' : 's'}</p>
          </div>
          <div class="content">
            ${htmlMessages || '<p style="color: #6b7280; text-align: center;">No messages in this session.</p>'}
          </div>
          <div class="footer">
            <p>This transcript was automatically generated after 2 hours of chat inactivity.</p>
            <p>&mdash; <span class="brand">Techdataseeders</span> &mdash;</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `CHAT TRANSCRIPT: ${identifier}
========================================
Total Messages: ${messageList.length}
========================================

${textMessages || 'No messages in this session.'}

--
This transcript was automatically generated after 2 hours of chat inactivity.
Techdataseeders
`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[chatbot] Chat transcript email sent to ${to} for ${identifier}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[chatbot] Chat transcript email send error for ${identifier}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendContactEmail,
  sendOtpEmail,
  sendChatTranscriptEmail,
  transporter
};