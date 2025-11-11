const nodemailer = require("nodemailer");

const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Email service credentials are not configured");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const buildPasswordResetEmail = ({ firstName, otp }) => {
  const displayName = firstName ? `${firstName}` : "there";
  const expiryMinutes = 30;

  return {
    subject: "Reset Your Jhonks Password",
    text: `Hello ${displayName},

We received a request to reset the password for your Jhonks account.

Your One-Time Password (OTP) is: ${otp}

This code will expire in ${expiryMinutes} minutes. If you did not request a password reset, please ignore this email — your password will remain unchanged.

Thank you,
The Jhonks Team`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="color: #047857;">Reset Your Jhonks Password</h2>
        <p>Hello ${displayName},</p>
        <p>We received a request to reset the password for your Jhonks account.</p>
        <p style="margin: 24px 0; font-size: 18px;">
          <strong>Your One-Time Password (OTP):</strong>
          <span style="display: inline-block; margin-left: 8px; padding: 12px 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; letter-spacing: 4px; font-weight: 600; font-size: 20px;">${otp}</span>
        </p>
        <p>This code will expire in ${expiryMinutes} minutes. For your security, please do not share this code with anyone.</p>
        <p>If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
        <p style="margin-top: 32px;">Warm regards,<br/>The Jhonks Team</p>
      </div>
    `,
  };
};

exports.sendPasswordResetOtp = async ({ email, firstName, otp }) => {
  const transporter = createTransporter();
  const { subject, text, html } = buildPasswordResetEmail({ firstName, otp });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"Jhonks Support" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    text,
    html,
  });
};


