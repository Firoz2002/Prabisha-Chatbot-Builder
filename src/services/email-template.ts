// services/email-templates.ts
export const createWorkspaceInvitationEmail = (
  workspaceName: string,
  invitedBy: string,
  invitationLink: string,
  expiresAt: Date,
  role: string = 'Member'
): string => {
  const formattedExpiry = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const backgroundColor = '#f8fafc';
  const primaryColor = '#3b82f6';
  const secondaryColor = '#64748b';
  const borderRadius = '8px';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workspace Invitation</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background-color: ${backgroundColor};
            margin: 0;
            padding: 20px;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: ${borderRadius};
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, ${primaryColor}, #1d4ed8);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        
        .logo {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 20px;
        }
        
        .icon {
            display: inline-block;
            width: 60px;
            height: 60px;
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
        }
        
        .icon svg {
            width: 32px;
            height: 32px;
        }
        
        h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .subtitle {
            font-size: 16px;
            opacity: 0.9;
            max-width: 400px;
            margin: 0 auto;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .info-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: ${borderRadius};
            padding: 25px;
            margin-bottom: 30px;
        }
        
        .info-row {
            display: flex;
            margin-bottom: 15px;
            align-items: center;
        }
        
        .info-row:last-child {
            margin-bottom: 0;
        }
        
        .info-label {
            font-weight: 600;
            color: ${secondaryColor};
            width: 120px;
            flex-shrink: 0;
        }
        
        .info-value {
            color: #1f2937;
        }
        
        .role-badge {
            display: inline-block;
            background-color: ${primaryColor}15;
            color: ${primaryColor};
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }
        
        .expiry-notice {
            background-color: #fef3c7;
            border: 1px solid #fde68a;
            border-radius: ${borderRadius};
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .expiry-notice strong {
            color: #92400e;
        }
        
        .cta-button {
            display: block;
            width: 100%;
            background-color: ${primaryColor};
            color: white;
            text-decoration: none;
            text-align: center;
            padding: 16px 32px;
            border-radius: ${borderRadius};
            font-size: 16px;
            font-weight: 600;
            margin: 30px 0;
            transition: all 0.2s ease;
        }
        
        .cta-button:hover {
            background-color: #2563eb;
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        }
        
        .footer {
            text-align: center;
            padding: 30px;
            color: ${secondaryColor};
            font-size: 14px;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer-links {
            margin-top: 20px;
        }
        
        .footer-links a {
            color: ${secondaryColor};
            text-decoration: none;
            margin: 0 10px;
        }
        
        .footer-links a:hover {
            color: ${primaryColor};
        }
        
        .powered-by {
            margin-top: 20px;
            font-size: 12px;
            opacity: 0.7;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content {
                padding: 30px 20px;
            }
            
            .info-row {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .info-label {
                width: 100%;
                margin-bottom: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🤝</div>
            <div class="icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
            </div>
            <h1>You're Invited!</h1>
            <p class="subtitle">Join the "${workspaceName}" workspace as a collaborator</p>
        </div>
        
        <div class="content">
            <div class="info-card">
                <div class="info-row">
                    <span class="info-label">Workspace:</span>
                    <span class="info-value"><strong>${workspaceName}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Invited by:</span>
                    <span class="info-value">${invitedBy}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Your Role:</span>
                    <span class="info-value">
                        <span class="role-badge">${role}</span>
                    </span>
                </div>
                <div class="info-row">
                    <span class="info-label">Invitation ID:</span>
                    <span class="info-value" style="font-family: monospace; font-size: 12px;">${invitationLink.split('token=')[1]?.slice(0, 12)}...</span>
                </div>
            </div>
            
            <div class="expiry-notice">
                <strong>⏰ Important:</strong> This invitation expires on ${formattedExpiry}
            </div>
            
            <a href="${invitationLink}" class="cta-button">
                Accept Invitation & Join Workspace
            </a>
            
            <p style="text-align: center; color: #64748b; margin-bottom: 20px;">
                Or copy and paste this link in your browser:
            </p>
            
            <p style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; font-size: 14px; color: #475569; text-align: center; font-family: monospace; word-break: break-all;">
                ${invitationLink}
            </p>
            
            <p style="text-align: center; color: #64748b; margin-top: 30px; font-size: 14px;">
                Questions? Reply to this email or contact the workspace admin.
            </p>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} Prabisha Chatbots. All rights reserved.</p>
            <div class="footer-links">
                <a href="https://yourdomain.com/help">Help Center</a>
                <a href="https://yourdomain.com/privacy">Privacy Policy</a>
                <a href="https://yourdomain.com/terms">Terms of Service</a>
            </div>
            <div class="powered-by">
                Powered by Prabisha Chatbots Platform
            </div>
        </div>
    </div>
</body>
</html>
  `;
};

export const createInvitationAcceptedEmail = (
  workspaceName: string,
  invitedUserName: string,
  invitedUserEmail: string
): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation Accepted</title>
    <style>
        body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #1f2937; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        .success-icon { font-size: 48px; margin-bottom: 20px; }
        .member-info { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .cta-button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="success-icon">✅</div>
            <h1>Invitation Accepted!</h1>
        </div>
        <div class="content">
            <h2>Great news!</h2>
            <p><strong>${invitedUserName} (${invitedUserEmail})</strong> has accepted your invitation to join the workspace:</p>
            
            <div class="member-info">
                <h3>👥 New Workspace Member</h3>
                <p><strong>Workspace:</strong> ${workspaceName}</p>
                <p><strong>Member:</strong> ${invitedUserName}</p>
                <p><strong>Email:</strong> ${invitedUserEmail}</p>
                <p><strong>Joined:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>They now have access to collaborate with you on this workspace.</p>
            
            <a href="https://yourdomain.com/workspaces" class="cta-button">
                View Workspace Members
            </a>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                You can manage member permissions from your workspace settings.
            </p>
        </div>
    </div>
</body>
</html>
  `;
};