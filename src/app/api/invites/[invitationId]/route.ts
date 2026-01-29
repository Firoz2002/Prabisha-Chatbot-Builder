// app/api/invites/[invitationId]/route.ts
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ invitationId: string }> }
) {
  try {
    const { invitationId } = await context.params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { message: 'Token is required' },
        { status: 400 }
      );
    }

    // Check if token is expired
    const now = new Date();
    
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { 
        id: invitationId,
        token: token,
        expiresAt: {
          gt: now // Check if invitation is not expired
        },
        status: 'PENDING' // Only fetch pending invitations
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        // invitedTo might be null if invitation was sent by email
        invitedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        // member might be null if not accepted yet
        member: {
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              }
            }
          }
        }
      },
    });

    if (!invitation) {
      // Check if it exists but is expired
      const expiredInvitation = await prisma.workspaceInvitation.findFirst({
        where: {
          id: invitationId,
          token: token,
          expiresAt: {
            lte: now // Check if expired
          }
        }
      });

      if (expiredInvitation) {
        // Update status to expired
        await prisma.workspaceInvitation.update({
          where: { id: invitationId },
          data: { status: 'EXPIRED' }
        });
        
        return NextResponse.json(
          { 
            message: 'Invitation has expired',
            status: 'EXPIRED'
          },
          { status: 410 } // 410 Gone
        );
      }

      // Check if it's revoked
      const revokedInvitation = await prisma.workspaceInvitation.findFirst({
        where: {
          id: invitationId,
          token: token,
          status: 'REVOKED'
        }
      });

      if (revokedInvitation) {
        return NextResponse.json(
          { 
            message: 'Invitation has been revoked',
            status: 'REVOKED'
          },
          { status: 410 }
        );
      }

      // Check if it's already accepted
      const acceptedInvitation = await prisma.workspaceInvitation.findFirst({
        where: {
          id: invitationId,
          token: token,
          status: 'ACCEPTED'
        }
      });

      if (acceptedInvitation) {
        return NextResponse.json(
          { 
            message: 'Invitation has already been accepted',
            status: 'ACCEPTED'
          },
          { status: 410 }
        );
      }

      return NextResponse.json(
        { message: 'Invalid or not found invitation' },
        { status: 404 }
      );
    }

    // Build the response
    const responseData = {
      id: invitation.id,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
      role: invitation.role,
      email: invitation.email,
      workspace: {
        id: invitation.workspace.id,
        name: invitation.workspace.name,
        createdAt: invitation.workspace.createdAt,
      },
      invitedBy: {
        id: invitation.invitedBy.id,
        name: invitation.invitedBy.name,
        email: invitation.invitedBy.email,
        image: invitation.invitedBy.image,
      },
      // invitedTo might be null if invitation was sent by email
      invitedTo: invitation.invitedTo ? {
        id: invitation.invitedTo.id,
        name: invitation.invitedTo.name,
        email: invitation.invitedTo.email,
        image: invitation.invitedTo.image,
      } : null,
      // member might be null if not accepted yet
      member: invitation.member ? {
        id: invitation.member.id,
        role: invitation.member.role,
        user: {
          id: invitation.member.user.id,
          name: invitation.member.user.name,
          email: invitation.member.user.email,
          image: invitation.member.user.image,
        }
      } : null,
      createdAt: invitation.createdAt,
    };

    return NextResponse.json({ 
      invitation: responseData
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { message: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}

// Optional: Add DELETE endpoint to revoke invitation
// app/api/invites/[invitationId]/route.ts
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ invitationId: string }> }
) {
  try {
    const { invitationId } = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) { // Changed from session.user?.sub to session.user?.id
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the invitation
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { 
        id: invitationId,
      },
      include: {
        workspace: true
      }
    });

    if (!invitation) {
      return NextResponse.json(
        { message: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if the current user is the one who sent the invitation
    // OR has admin/owner permissions in the workspace
    if (invitation.invitedById !== session.user.id) { // Changed from session.user.sub to session.user.id
      // Check if user is workspace admin/owner
      const workspaceMember = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id, // Changed from session.user.sub to session.user.id
          workspaceId: invitation.workspaceId,
          role: {
            in: ['OWNER', 'ADMIN']
          }
        }
      });

      if (!workspaceMember) {
        return NextResponse.json(
          { message: 'You do not have permission to revoke this invitation' },
          { status: 403 }
        );
      }
    }

    // Update status to REVOKED instead of deleting
    const updatedInvitation = await prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' },
      include: {
        workspace: {
          select: {
            name: true
          }
        }
      }
    });

    return NextResponse.json({ 
      message: 'Invitation revoked successfully',
      workspaceName: updatedInvitation.workspace.name
    }, { status: 200 });
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return NextResponse.json(
      { message: 'Failed to revoke invitation' },
      { status: 500 }
    );
  }
}

// Optional: Add POST endpoint to respond to invitation
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ invitationId: string }> }
) {
  try {
    const { invitationId } = await context.params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const { action } = await req.json(); // action: 'accept' or 'reject'

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { message: 'Token is required' },
        { status: 400 }
      );
    }

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { message: 'Invalid action. Must be "accept" or "reject"' },
        { status: 400 }
      );
    }

    const now = new Date();
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { 
        id: invitationId,
        token: token,
        expiresAt: {
          gt: now
        },
        status: 'PENDING'
      },
      include: {
        workspace: true,
        invitedTo: true
      }
    });

    if (!invitation) {
      return NextResponse.json(
        { message: 'Invalid, expired, or already processed invitation' },
        { status: 404 }
      );
    }

    const status = action === 'accept' ? 'ACCEPTED' : 'REJECTED';
    
    // Update invitation status
    const updatedInvitation = await prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: { status }
    });

    if (action === 'accept') {
      // Add user to workspace members
      await prisma.workspaceMember.create({
        data: {
          userId: session.user.id,
          workspaceId: invitation.workspaceId,
          role: 'MEMBER', // Default role for invited members
          // Link the invitation to this member
          invitations: {
            connect: { id: invitationId }
          }
        }
      });
    }

    return NextResponse.json({ 
      message: `Invitation ${action}ed successfully`,
      status,
      workspaceId: invitation.workspaceId
    }, { status: 200 });
  } catch (error) {
    console.error('Error processing invitation response:', error);
    
    // Handle unique constraint violation (already a member)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { 
          message: 'You are already a member of this workspace',
          status: 'ALREADY_MEMBER'
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { message: 'Failed to process invitation response' },
      { status: 500 }
    );
  }
}