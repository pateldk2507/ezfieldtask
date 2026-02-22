import nodemailer from "nodemailer";
import type { Organization } from "../shared/schema";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

function createTransporter(org: Organization) {
  if (!org.smtpHost || !org.smtpUser || !org.smtpPass) {
    return null;
  }

  const port = org.smtpPort || 587;
  return nodemailer.createTransport({
    host: org.smtpHost,
    port,
    secure: port === 465,
    auth: {
      user: org.smtpUser,
      pass: org.smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export async function sendEmail(org: Organization, options: EmailOptions): Promise<boolean> {
  const transporter = createTransporter(org);
  if (!transporter) {
    console.log("Email not sent: SMTP not configured for organization", org.name);
    console.log("SMTP config check - host:", org.smtpHost, "user:", org.smtpUser, "pass set:", !!org.smtpPass);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: org.smtpUser!,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log(`Email sent to ${options.to}: ${options.subject} (messageId: ${info.messageId})`);
    return true;
  } catch (error: any) {
    console.error("Failed to send email:", error?.message || error);
    console.error("SMTP details - host:", org.smtpHost, "port:", org.smtpPort, "user:", org.smtpUser);
    return false;
  }
}

export async function verifySmtpConnection(org: Organization): Promise<{ success: boolean; error?: string }> {
  const transporter = createTransporter(org);
  if (!transporter) {
    return { success: false, error: "SMTP not configured. Please fill in host, username, and password." };
  }

  try {
    await transporter.verify();
    return { success: true };
  } catch (error: any) {
    const msg = error?.message || "Unknown error";
    console.error("SMTP verification failed:", msg);
    return { success: false, error: msg };
  }
}

export function sendWelcomeEmail(
  org: Organization,
  staffEmail: string,
  staffName: string,
  tempPassword: string,
  role: string
): Promise<boolean> {
  const subject = `Welcome to ${org.name} - Your Account Details`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: #0066FF; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome to ${org.name}</h1>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 16px; color: #333;">Hi ${staffName},</p>
        <p style="font-size: 15px; color: #555; line-height: 1.6;">
          Your account has been created on <strong>EZ Field Task</strong>. You can now log in and start using the system.
        </p>
        <div style="background: #F8F9FA; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #0066FF;">
          <h3 style="margin: 0 0 16px 0; color: #333; font-size: 16px;">Your Login Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #777; font-size: 14px; width: 140px;">Organization:</td>
              <td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 600;">${org.slug}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #777; font-size: 14px;">Email:</td>
              <td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 600;">${staffEmail}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #777; font-size: 14px;">Temporary Password:</td>
              <td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 600; font-family: monospace; background: #FFF3CD; padding: 4px 8px; border-radius: 4px;">${tempPassword}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #777; font-size: 14px;">Role:</td>
              <td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 600;">${role.charAt(0).toUpperCase() + role.slice(1)}</td>
            </tr>
          </table>
        </div>
        <div style="background: #FFF3CD; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>Important:</strong> Please change your password after your first login by going to Settings.
          </p>
        </div>
        <p style="font-size: 14px; color: #777; margin-top: 24px;">
          If you have any questions, please contact your administrator.
        </p>
      </div>
      <div style="background: #F8F9FA; padding: 20px; text-align: center; border-top: 1px solid #E9ECEF;">
        <p style="margin: 0; color: #999; font-size: 12px;">
          Powered by EZ Field Task &bull; ezfieldtask.ca
        </p>
      </div>
    </div>
  `;

  return sendEmail(org, { to: staffEmail, subject, html });
}

export function sendTaskAssignmentEmail(
  org: Organization,
  techEmail: string,
  techName: string,
  taskTitle: string,
  taskDescription: string,
  scheduledDate: string,
  scheduledTime: string,
  address: string,
  contactName: string,
  contactPhone: string,
  urgency: string
): Promise<boolean> {
  const urgencyColors: Record<string, string> = {
    low: "#10B981",
    medium: "#F59E0B",
    high: "#F97316",
    critical: "#EF4444",
  };

  const urgencyColor = urgencyColors[urgency] || "#F59E0B";

  const subject = `New Task Assigned: ${taskTitle}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: #0066FF; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Task Assignment</h1>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 16px; color: #333;">Hi ${techName},</p>
        <p style="font-size: 15px; color: #555; line-height: 1.6;">
          A new task has been assigned to you. Here are the details:
        </p>
        <div style="background: #F8F9FA; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid ${urgencyColor};">
          <h3 style="margin: 0 0 8px 0; color: #333; font-size: 18px;">${taskTitle}</h3>
          <span style="display: inline-block; background: ${urgencyColor}20; color: ${urgencyColor}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
            ${urgency}
          </span>
          <p style="color: #555; font-size: 14px; margin-top: 12px; line-height: 1.6;">${taskDescription}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr>
              <td style="padding: 8px 0; color: #777; font-size: 14px; width: 120px; vertical-align: top;">
                📅 Date:
              </td>
              <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${scheduledDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #777; font-size: 14px; vertical-align: top;">
                🕐 Time:
              </td>
              <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${scheduledTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #777; font-size: 14px; vertical-align: top;">
                📍 Address:
              </td>
              <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${address}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #777; font-size: 14px; vertical-align: top;">
                👤 Contact:
              </td>
              <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${contactName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #777; font-size: 14px; vertical-align: top;">
                📞 Phone:
              </td>
              <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${contactPhone}</td>
            </tr>
          </table>
        </div>
        <p style="font-size: 14px; color: #555;">
          Please review the task details and prepare accordingly. Log in to EZ Field Task for more information.
        </p>
      </div>
      <div style="background: #F8F9FA; padding: 20px; text-align: center; border-top: 1px solid #E9ECEF;">
        <p style="margin: 0; color: #999; font-size: 12px;">
          Powered by EZ Field Task &bull; ${org.name}
        </p>
      </div>
    </div>
  `;

  return sendEmail(org, { to: techEmail, subject, html });
}

export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const specials = "!@#$%";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password += specials.charAt(Math.floor(Math.random() * specials.length));
  return password;
}
