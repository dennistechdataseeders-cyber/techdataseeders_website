const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function testEmail() {
  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    console.log('📧 Email settings are correct.');
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Check SMTP_HOST and SMTP_PORT');
    console.log('2. For Gmail, make sure you have 2FA enabled and created an App Password');
    console.log('3. Check if your email provider allows SMTP access');
  }
}

testEmail();