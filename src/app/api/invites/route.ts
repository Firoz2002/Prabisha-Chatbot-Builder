import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { InvitationStatus, WorkspaceRole } from '../../../../generated/prisma/enums';
import { sendMail } from '@/services/mailing.service';
import { createWorkspaceInvitationEmail } from '@/services/email-template';

export async function GET(req: NextRequest) {
    const token = await getToken({ req });
    if (!token || !token.sub) return new NextResponse('Unauthorized', { status: 401 });

    try {
        // Get all workspace invitations sent by the current user
        const sentInvites = await prisma.workspaceInvitation.findMany({
            where: {
                invitedById: token.sub,
                status: 'PENDING', // Only show pending invites by default
            },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                invitedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Get all workspace invitations received by the current user
        const receivedInvites = await prisma.workspaceInvitation.findMany({
            where: {
                invitedToId: token.sub,
                status: 'PENDING',
            },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                invitedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ 
            sent: sentInvites,
            received: receivedInvites 
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching invites:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const token = await getToken({ req });
    if (!token || !token.sub) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { invitationToken, status, role = 'MEMBER' } = await req.json();

        if(!invitationToken || !status) {
            return NextResponse.json({ 
                message: 'Invalid request. invitationToken and status are required.' 
            }, { status: 400 });
        }

        // Validate status
        if (!Object.values(InvitationStatus).includes(status)) {
            return NextResponse.json({ 
                message: 'Invalid status value' 
            }, { status: 400 });
        }

        // Validate role if provided
        if (role && !Object.values(WorkspaceRole).includes(role)) {
            return NextResponse.json({ 
                message: 'Invalid role value' 
            }, { status: 400 });
        }

        // Check if invitation exists and belongs to current user
        const invitation = await prisma.workspaceInvitation.findFirst({
            where: { 
                token: invitationToken,
                invitedToId: token.sub, // Ensure user can only respond to their own invites
                status: 'PENDING', // Only allow updates for pending invitations
                expiresAt: {
                    gt: new Date() // Check if not expired
                }
            },
            include: {
                workspace: true
            }
        });

        if (!invitation) {
            return NextResponse.json({ 
                message: 'Invitation not found, expired, or already processed' 
            }, { status: 404 });
        }

        // Update invitation status
        const updatedInvitation = await prisma.workspaceInvitation.update({
            where: { token: invitationToken },
            data: { status }
        });

        // If accepting, add user to workspace
        if(status === InvitationStatus.ACCEPTED) {
            try {
                // Check if user is already a member
                const existingMember = await prisma.workspaceMember.findFirst({
                    where: {
                        userId: token.sub,
                        workspaceId: invitation.workspaceId
                    }
                });

                if (existingMember) {
                    // Update the invitation to link with existing member
                    await prisma.workspaceInvitation.update({
                        where: { token: invitationToken },
                        data: {
                            memberId: existingMember.id
                        }
                    });
                    
                    return NextResponse.json({ 
                        message: 'You are already a member of this workspace',
                        invitation: updatedInvitation,
                        isAlreadyMember: true
                    }, { status: 200 });
                }

                // Create new workspace member
                const workspaceMember = await prisma.workspaceMember.create({
                    data: {
                        userId: token.sub,
                        workspaceId: invitation.workspaceId,
                        role: role as WorkspaceRole,
                    }
                });

                // Link the invitation to the created member
                await prisma.workspaceInvitation.update({
                    where: { token: invitationToken },
                    data: {
                        memberId: workspaceMember.id
                    }
                });

                // Return success with member info
                return NextResponse.json({ 
                    message: 'Successfully joined workspace',
                    invitation: updatedInvitation,
                    workspaceMember: {
                        id: workspaceMember.id,
                        role: workspaceMember.role,
                        workspaceId: workspaceMember.workspaceId,
                        workspaceName: invitation.workspace.name
                    }
                }, { status: 200 });

            } catch (error) {
                // Handle unique constraint violation
                if (error instanceof Error && error.message.includes('Unique constraint')) {
                    return NextResponse.json({ 
                        message: 'You are already a member of this workspace',
                        invitation: updatedInvitation,
                        isAlreadyMember: true
                    }, { status: 409 });
                }
                throw error;
            }
        }

        // If rejecting, just update status
        return NextResponse.json({ 
            message: `Invitation ${status.toLowerCase()}`,
            invitation: updatedInvitation
        }, { status: 200 });

    } catch (error) {
        console.error('Error updating invitation:', error);
        
        // Handle specific errors
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            return NextResponse.json({ 
                message: 'Invitation not found' 
            }, { status: 404 });
        }

        return NextResponse.json({ 
            message: 'Internal Server Error' 
        }, { status: 500 });
    }
}

// Update the POST endpoint in your API route
// Update the POST endpoint in app/api/invites/route.ts
export async function POST(req: NextRequest) {
    const token = await getToken({ req });
    if (!token || !token.sub) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { workspaceId, email, role = 'MEMBER' } = await req.json();
        
        if (!workspaceId || !email) {
            return NextResponse.json({ 
                message: 'workspaceId and email are required' 
            }, { status: 400 });
        }

        // Check if user has permission to invite to this workspace
        const isAuthorized = await prisma.workspaceMember.findFirst({
            where: {
                userId: token.sub,
                workspaceId: workspaceId,
                role: {
                    in: ['OWNER', 'ADMIN']
                }
            }
        });

        if (!isAuthorized) {
            return NextResponse.json({ 
                message: 'You do not have permission to invite users to this workspace' 
            }, { status: 403 });
        }

        // Find if user exists
        const userToInvite = await prisma.user.findUnique({
            where: { email }
        });

        // Check if user is already a member (only for existing users)
        if (userToInvite) {
            const existingMember = await prisma.workspaceMember.findFirst({
                where: {
                    userId: userToInvite.id,
                    workspaceId: workspaceId
                }
            });

            if (existingMember) {
                return NextResponse.json({ 
                    message: 'User is already a member of this workspace' 
                }, { status: 409 });
            }
        }

        // Check for existing pending invitation for this email/workspace
        const existingInvitation = await prisma.workspaceInvitation.findFirst({
            where: {
                workspaceId: workspaceId,
                OR: [
                    { email: email },
                    { invitedToId: userToInvite?.id || null }
                ],
                status: 'PENDING',
                expiresAt: {
                    gt: new Date()
                }
            }
        });

        if (existingInvitation) {
            return NextResponse.json({ 
                message: 'A pending invitation already exists for this user/email',
                invitation: existingInvitation
            }, { status: 409 });
        }

        // Get workspace details and inviter info
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { name: true }
        });

        const inviter = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { name: true, email: true }
        });

        // Create invitation (expires in 7 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invitationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

        const invitationData: any = {
            workspaceId: workspaceId,
            invitedById: token.sub,
            status: 'PENDING',
            token: invitationToken,
            expiresAt: expiresAt,
            role: role as WorkspaceRole
        };

        // If user exists, link to user, otherwise store email
        if (userToInvite) {
            invitationData.invitedToId = userToInvite.id;
        } else {
            invitationData.email = email;
        }

        const invitation = await prisma.workspaceInvitation.create({
            data: invitationData,
            include: {
                workspace: {
                    select: {
                        name: true
                    }
                }
            }
        });

        // Send invitation email
        try {
            const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/invites/${invitation.id}?token=${invitationToken}`;
            
            const emailHtml = createWorkspaceInvitationEmail(
                workspace?.name || 'Workspace',
                inviter?.name || inviter?.email || 'A team member',
                invitationLink,
                expiresAt,
                role,
            );

            await sendMail({
                recipient: email,
                subject: userToInvite 
                    ? `📬 You're invited to join "${workspace?.name}" workspace`
                    : `📬 Register to join "${workspace?.name}" workspace`,
                message: emailHtml,
            });

            // Send notification to inviter
            if (inviter?.email) {
                const statusText = userToInvite ? 'invited' : 'sent a registration link to';
                const inviterEmailHtml = `
                    <p>Hi ${inviter?.name || 'there'},</p>
                    <p>You've successfully ${statusText} <strong>${email}</strong> to join the workspace <strong>"${workspace?.name}"</strong>.</p>
                    <p>The invitation expires on ${expiresAt.toLocaleDateString()}.</p>
                    <p>You can track invitation status from your dashboard.</p>
                `;

                await sendMail({
                    recipient: inviter.email,
                    subject: `✅ Invitation sent to ${email}`,
                    message: inviterEmailHtml,
                });
            }

        } catch (emailError) {
            console.error('Failed to send invitation email:', emailError);
        }

        return NextResponse.json({ 
            message: userToInvite ? 'Invitation sent successfully' : 'Registration invitation sent successfully',
            invitation: invitation,
            userExists: !!userToInvite
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating invitation:', error);
        return NextResponse.json({ 
            message: 'Internal Server Error' 
        }, { status: 500 });
    }
}