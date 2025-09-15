import { supabase } from "@/lib/supabase";

export interface WelcomeEmailData {
  firstName: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
}

export class EmailService {
  // Generate a secure temporary password
  static generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Send welcome email with credentials using SendGrid
  static async sendWelcomeEmail(data: WelcomeEmailData): Promise<{ success: boolean; message: string }> {
    try {
      // Call Supabase Edge Function for SendGrid email sending
      const { data: result, error } = await supabase.functions.invoke('send-welcome-email-sendgrid', {
        body: {
          to: data.email,
          firstName: data.firstName,
          temporaryPassword: data.temporaryPassword,
          loginUrl: data.loginUrl
        }
      });

      if (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error sending welcome email via SendGrid:', errorMessage);

        // For development, fall back to console logging
        if (process.env.NODE_ENV === 'development') {
          console.log('=== WELCOME EMAIL (DEV MODE - SendGrid) ===');
          console.log(`To: ${data.email}`);
          console.log(`Subject: Welcome to Maigon - Your Login Credentials`);
          console.log(`Temporary Password: ${data.temporaryPassword}`);
          console.log(`Login URL: ${data.loginUrl}`);
          console.log(`Template: Welcome Template with Dynamic Data`);
          console.log('==========================================');

          return {
            success: true,
            message: `Development mode: Credentials logged to console. Temporary password: ${data.temporaryPassword}`
          };
        }

        return { success: false, message: 'Failed to send welcome email. Please try again.' };
      }

      return { success: true, message: 'Welcome email sent successfully via SendGrid!' };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Unexpected error sending email:', errorMessage);
      return { success: false, message: errorMessage || 'Failed to send welcome email.' };
    }
  }

  // Generate HTML email template
  private static generateWelcomeEmailHTML(data: WelcomeEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Maigon</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9f8f8; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 32px; font-weight: bold; color: #9A7C7C; }
          .content { line-height: 1.6; color: #333; }
          .credentials { background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #9A7C7C; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">MAIGON</div>
          </div>
          
          <div class="content">
            <h2>Welcome to Maigon, ${data.firstName}!</h2>
            
            <p>Your account has been successfully created. We're excited to have you join our platform for AI-powered legal review.</p>
            
            <div class="credentials">
              <h3>Your Login Credentials</h3>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Temporary Password:</strong> <code>${data.temporaryPassword}</code></p>
            </div>
            
            <div class="warning">
              <p><strong>Important:</strong> This is a temporary password. You'll be prompted to change it when you first log in for security purposes.</p>
            </div>
            
            <p>Click the button below to access your account:</p>
            
            <a href="${data.loginUrl}" class="button">Log In to Maigon</a>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${data.loginUrl}">${data.loginUrl}</a></p>
            
            <h3>What's Next?</h3>
            <ol>
              <li>Log in using your temporary credentials</li>
              <li>Change your password to something secure and memorable</li>
              <li>Complete your profile setup</li>
              <li>Start your first contract review!</li>
            </ol>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Best regards,<br>The Maigon Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent to ${data.email}. If you didn't create an account with Maigon, please ignore this email.</p>
            <p>&copy; 2024 Maigon. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send password reset email using SendGrid
  static async sendPasswordResetEmail(email: string, resetUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset-sendgrid', {
        body: {
          to: email,
          resetUrl
        }
      });

      if (error) {
        console.error('Error sending password reset email via SendGrid:', error);

        // Development fallback
        if (process.env.NODE_ENV === 'development') {
          console.log('=== PASSWORD RESET EMAIL (DEV MODE - SendGrid) ===');
          console.log(`To: ${email}`);
          console.log(`Reset URL: ${resetUrl}`);
          console.log(`Template: Password Reset Template`);
          console.log('==============================================');
        }

        return { success: false, message: 'Failed to send password reset email.' };
      }

      return { success: true, message: 'Password reset email sent successfully via SendGrid!' };
    } catch (error: any) {
      console.error('Unexpected error sending password reset email:', error);
      return { success: false, message: error.message || 'Failed to send password reset email.' };
    }
  }
}
