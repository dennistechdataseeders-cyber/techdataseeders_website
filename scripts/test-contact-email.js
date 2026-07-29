const { sendContactEmail } = require('../utils/email');

async function testContactEmail() {
  const testData = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '+1 555 123 4567',
    message: 'This is a test message from the contact form.',
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Test)'
  };
  
  console.log('📧 Testing email sending...');
  const result = await sendContactEmail(testData);
  
  if (result.success) {
    console.log('✅ Email sent successfully!');
    console.log('📨 Message ID:', result.messageId);
  } else {
    console.error('❌ Email failed:', result.error);
  }
}

testContactEmail();