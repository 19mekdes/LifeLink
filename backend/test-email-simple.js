import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function testSimpleEmail() {
  console.log('📧 Testing email with simple config...');
  console.log('📡 EMAIL_USER:', process.env.EMAIL_USER);
  console.log('📡 EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('📡 EMAIL_PORT:', process.env.EMAIL_PORT);
  
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified!');

    // Send email
    const info = await transporter.sendMail({
      from: `"LifeLink" <${process.env.EMAIL_USER}>`,
      to: 'mekdesw60@gmail.com',
      subject: '✅ LifeLink Test Email',
      html: `
        <h1>✅ Email Test Successful!</h1>
        <p>This is a test email from LifeLink.</p>
        <p>Time: ${new Date().toLocaleString()}</p>
        <p>Your email configuration is working!</p>
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Check your Gmail inbox!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check EMAIL_PASS is the 16-char App Password');
    console.log('2. Make sure 2-Step Verification is enabled');
    console.log('3. Check if "Less secure app access" is turned on');
    console.log('4. Try using a different email account');
  }
}

testSimpleEmail();