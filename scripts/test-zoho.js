const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('\n📧 Testing Zoho SMTP with sales@techdats.in');
console.log('===========================================');

// Log config (without showing full password)
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set (' + process.env.SMTP_PASS.length + ' chars)' : '❌ NOT SET');
console.log('===========================================\n');

if (!process.env.SMTP_USER || !process.env.SMTP_USER.includes('@')) {
  console.error('❌ ERROR: SMTP_USER is missing or invalid!');
  console.log('Please set SMTP_USER to: sales@techdats.in');
  process.exit(1);
}

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

// Test connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP connection failed!');
    console.error('Error:', error.message);
    if (error.response) console.error('Response:', error.response);
    
    console.log('\n💡 Troubleshooting:');
    console.log('1. SMTP_USER must be: sales@techdats.in');
    console.log('2. App Password must be 16 characters');
    console.log('3. 2FA must be enabled on your Zoho account');
    console.log('4. SMTP must be enabled in Zoho Mail Settings');
    console.log('5. Try port 465 with secure: true');
    process.exit(1);
  } else {
    console.log('✅ SMTP connection successful!');
    console.log('📧 Zoho email is ready.\n');
    
    // Send test email
    console.log('📤 Sending test email to dennis.techdataseeders@gmail.com...');
    
    const testMail = {
      from: process.env.SMTP_FROM || 'sales@techdats.in',
      to: 'dennis.techdataseeders@gmail.com',
      subject: '✅ Zoho SMTP Test - Techdataseeders (sales@techdats.in)',
      html: `
        <h1>✅ Zoho SMTP is Working!</h1>
        <p>This is a test email from Techdataseeders.</p>
        <p><strong>From:</strong> sales@techdats.in</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</p>
        <p><strong>Port:</strong> ${process.env.SMTP_PORT}</p>
      `,
      text: `Zoho SMTP is working! Test from sales@techdats.in at ${new Date().toLocaleString()}`
    };
    
    transporter.sendMail(testMail, (err, info) => {
      if (err) {
        console.error('❌ Test email failed:', err.message);
      } else {
        console.log('✅ Test email sent successfully!');
        console.log('📨 Message ID:', info.messageId);
        console.log('📧 Check: dennis.techdataseeders@gmail.com');
      }
    });
  }
});