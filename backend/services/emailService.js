const nodemailer = require('nodemailer');
const https = require('https');

/**
 * Send Password Reset OTP email via Brevo with fallback strategies
 * @param {string} recipientEmail - Email address of the recipient
 * @param {string} otpCode - 6-digit OTP code
 */
const sendOtpEmail = async (recipientEmail, otpCode) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || 'rajveersinhzala953@gmail.com';
  const senderName = process.env.SENDER_NAME || 'Rajveersinh From Student portal';

  console.log(`\n==================================================`);
  console.log(`🔑 [BREVO OTP GENERATED FOR ${recipientEmail}]: ${otpCode}`);
  console.log(`==================================================\n`);

  if (!apiKey) {
    throw new Error('BREVO_API_KEY is missing in environment variables.');
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f9ff; margin: 0; padding: 20px; color: #0f172a; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(2, 132, 199, 0.1); border: 1px solid #bae6fd; }
        .header { text-align: center; margin-bottom: 24px; }
        .logo-badge { display: inline-block; background: linear-gradient(135deg, #0284c7, #38bdf8); color: white; width: 48px; height: 48px; line-height: 48px; border-radius: 12px; font-size: 24px; font-weight: bold; margin-bottom: 12px; }
        .title { color: #0369a1; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; }
        .subtitle { color: #64748b; font-size: 14px; margin: 0; }
        .otp-box { background: linear-gradient(135deg, #e0f2fe, #f0f9ff); border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0284c7; margin: 0; font-family: monospace; }
        .info-list { background: #f8fafc; border-radius: 8px; padding: 16px; font-size: 13px; color: #475569; margin-bottom: 24px; }
        .info-list p { margin: 6px 0; display: flex; align-items: center; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-badge">📚</div>
          <h1 class="title">Password Reset Request</h1>
          <p class="subtitle">Syllabus Portal Authentication</p>
        </div>
        <p>Hello,</p>
        <p>We received a request to reset your password. Use the single-use OTP code below to complete your password reset:</p>
        
        <div class="otp-box">
          <h2 class="otp-code">${otpCode}</h2>
        </div>

        <div class="info-list">
          <p>⏱️ <strong>Valid for:</strong> 5 minutes (300 seconds)</p>
          <p>🛡️ <strong>Max attempts:</strong> 5 incorrect tries allowed</p>
          <p>⚠️ If you did not request a password reset, please ignore this email.</p>
        </div>

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Syllabus Portal. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const errors = [];

  // STRATEGY 1: Brevo REST API v3
  try {
    console.log('[EmailService] Trying Brevo REST API v3...');
    const payload = JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: recipientEmail }],
      subject: `🔒 ${otpCode} is your Password Reset OTP`,
      htmlContent
    });

    const restResult = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.brevo.com',
        port: 443,
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Status ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    console.log('✅ OTP Email sent successfully via Brevo REST API');
    return restResult;
  } catch (apiErr) {
    console.warn(`[EmailService] Brevo REST API failed: ${apiErr.message}`);
    errors.push(`REST API: ${apiErr.message}`);
  }

  // STRATEGY 2: Brevo SMTP Relay (with senderEmail as user)
  try {
    console.log('[EmailService] Trying Brevo SMTP Relay (Port 587)...');
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: senderEmail,
        pass: apiKey
      },
      tls: { rejectUnauthorized: false }
    });

    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: recipientEmail,
      subject: `🔒 ${otpCode} is your Password Reset OTP`,
      html: htmlContent
    });

    console.log('✅ OTP Email sent successfully via Brevo SMTP Relay:', info.messageId);
    return info;
  } catch (smtpErr1) {
    console.warn(`[EmailService] Brevo SMTP Relay failed: ${smtpErr1.message}`);
    errors.push(`SMTP: ${smtpErr1.message}`);
  }

  // STRATEGY 3: Gmail Direct SMTP (If GMAIL_USER and GMAIL_PASS exist)
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    try {
      console.log('[EmailService] Trying Gmail SMTP Fallback...');
      const gmailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      });

      const info = await gmailTransporter.sendMail({
        from: `"${senderName}" <${process.env.GMAIL_USER}>`,
        to: recipientEmail,
        subject: `🔒 ${otpCode} is your Password Reset OTP`,
        html: htmlContent
      });

      console.log('✅ OTP Email sent successfully via Gmail SMTP:', info.messageId);
      return info;
    } catch (gmailErr) {
      console.warn(`[EmailService] Gmail SMTP failed: ${gmailErr.message}`);
      errors.push(`Gmail: ${gmailErr.message}`);
    }
  }

  // If all strategies fail, throw detailed error with guidance for user
  const combinedError = errors.join(' | ');
  console.error(`❌ [EmailService Failure] All email strategies failed: ${combinedError}`);
  throw new Error(`Email delivery failed: ${combinedError}. Please verify Brevo API Key / Verified Sender in Brevo Dashboard. (Note: Dev OTP Code is ${otpCode})`);
};

module.exports = { sendOtpEmail };
