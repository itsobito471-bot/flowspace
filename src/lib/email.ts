import nodemailer from "nodemailer";

interface SendThankYouEmailParams {
  to_email: string;
  name: string;
}

export const sendThankYouEmail = async ({
  to_email,
  name,
}: SendThankYouEmailParams) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true" || false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px; color: #111827; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
          .logo { text-align: center; margin-bottom: 30px; font-weight: 800; font-size: 24px; color: #111827; letter-spacing: -0.02em; }
          .logo span { color: #00E8D2; }
          h1 { font-size: 20px; margin-bottom: 20px; color: #111827; }
          p { font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 20px; }
          .button { display: inline-block; background-color: #00E8D2; color: #080b10; font-weight: 600; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 10px; }
          .footer { margin-top: 40px; text-align: center; font-size: 14px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Flow<span>Space</span></div>
          <h1>Thank you for your enquiry, ${name}!</h1>
          <p>We've received your request and our team is already reviewing it. We appreciate your interest in FlowSpace.</p>
          <p>A solutions engineer will be in touch with you within the next 24 hours to discuss your team's requirements and arrange a personalised demo.</p>
          <p>If you have any immediate questions, feel free to reply directly to this email.</p>
          <p>Best regards,<br/>The FlowSpace Team</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} FlowSpace. All rights reserved.
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"FlowSpace Team" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: to_email,
      subject: "Thank you for contacting FlowSpace",
      html: htmlContent,
    });

    console.log("Message sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};
