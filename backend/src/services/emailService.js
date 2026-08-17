import nodemailer from 'nodemailer';

const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT);
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Create transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465, 
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 * @returns {Promise} - Nodemailer response
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
};

// ============ EMAIL TEMPLATES ============

/**
 * Welcome email template
 */
export const welcomeEmail = (name, email) => {
  return {
    subject: 'Welcome to LifeLink! 🩸',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🩸 Welcome to LifeLink!</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>Thank you for joining LifeLink! You are now part of a community that saves lives.</p>
            <p>Your email <strong>${email}</strong> has been registered successfully.</p>
            <p>You can now:</p>
            <ul>
              <li>✅ Register as a blood donor</li>
              <li>✅ Receive emergency blood requests</li>
              <li>✅ Track your donation history</li>
              <li>✅ Save lives in your community</li>
            </ul>
            <p style="text-align: center;">
              <a href="${FRONTEND_URL}/login.html" class="button">Get Started</a>
            </p>
          </div>
          <div class="footer">
            <p>© 2026 LifeLink. Every drop counts.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};

/**
 * Emergency blood request notification
 */
export const emergencyRequestEmail = (donorName, request) => {
  const urgencyEmoji = request.urgency === 'CRITICAL_EMERGENCY' ? '🚨' : 
                       request.urgency === 'URGENT' ? '⚠️' : 'ℹ️';
  
  return {
    subject: `${urgencyEmoji} Emergency Blood Request: ${request.bloodType} Needed!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .emergency { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
          .details { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${urgencyEmoji} Emergency Blood Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${donorName},</h2>
            <div class="emergency">
              <p><strong>⚠️ Urgent blood donation needed!</strong></p>
            </div>
            <div class="details">
              <p><strong>🏥 Hospital:</strong> ${request.hospital?.hospitalName || 'Unknown Hospital'}</p>
              <p><strong>🩸 Blood Type:</strong> ${request.bloodType}</p>
              <p><strong>📦 Units Required:</strong> ${request.unitsRequired}</p>
              <p><strong>📍 Location:</strong> ${request.location}</p>
              <p><strong>📱 Contact:</strong> ${request.contactInformation}</p>
              ${request.description ? `<p><strong>📝 Notes:</strong> ${request.description}</p>` : ''}
            </div>
            <p style="text-align: center;">
              <a href="${FRONTEND_URL}/donor-dashboard.html" class="button">View Request & Respond</a>
            </p>
            <p style="text-align: center; font-size: 14px; color: #6b7280;">
              Please respond as soon as possible. Your help can save a life! ❤️
            </p>
          </div>
          <div class="footer">
            <p>© 2026 LifeLink. Every drop counts.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};

/**
 * Donation confirmation email
 */
export const donationConfirmationEmail = (donorName, donation) => {
  return {
    subject: 'Thank You for Your Donation! ❤️',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #16a34a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
          .details { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
          .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 9999px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❤️ Thank You for Donating!</h1>
          </div>
          <div class="content">
            <h2>Hello ${donorName},</h2>
            <p>You have just made a life-saving donation. We are incredibly grateful for your generosity!</p>
            <div class="details">
              <p><strong>🏥 Hospital:</strong> ${donation.hospital?.hospitalName || 'Unknown Hospital'}</p>
              <p><strong>🩸 Blood Type:</strong> ${donation.request?.bloodType || 'N/A'}</p>
              <p><strong>📦 Units Donated:</strong> ${donation.units}</p>
              <p><strong>📅 Date:</strong> ${new Date(donation.donationDate).toLocaleDateString()}</p>
              <p><strong>📋 Status:</strong> <span class="badge">${donation.status}</span></p>
            </div>
            <p>Your donation will help save up to <strong>${donation.units * 3}</strong> lives!</p>
            <p style="text-align: center;">
              <a href="${FRONTEND_URL}/donor-dashboard.html" class="button">View My Donations</a>
            </p>
          </div>
          <div class="footer">
            <p>© 2026 LifeLink. Every drop counts.</p>
            <p><small>You can donate again after 90 days.</small></p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};

/**
 * Request status update email
 */
export const requestStatusUpdateEmail = (hospitalName, request) => {
  const statusMessages = {
    'APPROVED': '✅ Your blood request has been APPROVED! We are processing it now.',
    'PROCESSING': '⏳ Your blood request is being PROCESSED.',
    'FULFILLED': '🎉 Your blood request has been FULFILLED! Blood units have been delivered.',
    'REJECTED': '❌ Your blood request has been REJECTED. Please contact the blood bank for details.',
    'CANCELLED': '📝 Your blood request has been CANCELLED as requested.',
  };

  return {
    subject: `Request Status Update: ${request.bloodType} - ${request.status}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
          .status { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Request Status Update</h1>
          </div>
          <div class="content">
            <h2>Hello ${hospitalName},</h2>
            <p>${statusMessages[request.status] || 'Your request status has been updated.'}</p>
            <div class="status">
              <p><strong>🩸 Blood Type:</strong> ${request.bloodType}</p>
              <p><strong>📦 Units:</strong> ${request.unitsRequired}</p>
              <p><strong>📋 Status:</strong> <strong>${request.status}</strong></p>
              ${request.fulfilledAt ? `<p><strong>📅 Fulfilled:</strong> ${new Date(request.fulfilledAt).toLocaleDateString()}</p>` : ''}
            </div>
            <p style="text-align: center;">
              <a href="${FRONTEND_URL}/hospital-dashboard.html" class="button">View Dashboard</a>
            </p>
          </div>
          <div class="footer">
            <p>© 2026 LifeLink. Every drop counts.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};

/**
 * Password reset email
 */
export const passwordResetEmail = (name, resetToken) => {
  const resetLink = `${FRONTEND_URL}/reset-password.html?token=${resetToken}`;
  
  return {
    subject: '🔐 Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
          .warning { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>We received a request to reset your password. Click the button below to create a new password.</p>
            <div class="warning">
              <p>⚠️ This link will expire in 1 hour.</p>
            </div>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2026 LifeLink. Every drop counts.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};

// Export all services
export default {
  sendEmail,
  welcomeEmail,
  emergencyRequestEmail,
  donationConfirmationEmail,
  requestStatusUpdateEmail,
  passwordResetEmail,
};