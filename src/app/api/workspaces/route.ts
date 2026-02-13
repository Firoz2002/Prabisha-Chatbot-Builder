// app/api/workspaces/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as z from "zod";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Safety check: Ensure the user exists in the local database
    // This handles cases where the session might have a Central ID that hasn't been synced yet
    let user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      console.log(`User ${session.user.id} not found in DB, attempting to sync by email ${session.user.email}`);
      // Try to find by email and update ID if it exists under old ID
      const existingUser = await prisma.user.findUnique({
        where: { email: session.user.email }
      });

      if (existingUser) {
        user = await prisma.user.update({
          where: { email: session.user.email },
          data: {
            id: session.user.id,
            name: session.user.name,
            image: session.user.image,
          }
        });
      } else {
        // Create new user if not found at all
        user = await prisma.user.create({
          data: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            image: session.user.image,
            role: 'USER'
          }
        });
      }
    }

    // Get user's workspaces with owner info
    const workspaceMemberships = await prisma.workspaceMember.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        workspace: {
          include: {
            members: {
              where: {
                role: 'OWNER'
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true
                  }
                }
              },
              take: 1
            }
          }
        }
      },
      orderBy: {
        workspace: {
          createdAt: 'asc'
        }
      }
    });

    // Transform the data to include owner info
    let workspaces = workspaceMemberships.map(membership => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      createdAt: membership.workspace.createdAt,
      owner: membership.workspace.members[0]?.user || null,
      // Add other fields you might need
      role: membership.role,
    }));

    // If user has no workspaces, create a default one
    if (workspaces.length === 0) {
      const newWorkspace = await prisma.workspace.create({
        data: {
          name: `${session.user.name || "My"}'s Workspace`, // Personalized default name
        },
      });

      await prisma.workspaceMember.create({
        data: {
          userId: session.user.id,
          workspaceId: newWorkspace.id,
          role: "OWNER"
        }
      });

      // Return the newly created workspace with owner info
      return NextResponse.json([{
        id: newWorkspace.id,
        name: newWorkspace.name,
        createdAt: newWorkspace.createdAt,
        owner: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image
        },
        role: 'OWNER',
        displayName: null,
      }]);
    }

    return NextResponse.json(workspaces);
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 });
  }
}

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(50),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Safety check: Ensure the user exists in the local database
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!userExists) {
      const existingUser = await prisma.user.findUnique({
        where: { email: session.user.email! }
      });

      if (existingUser) {
        await prisma.user.update({
          where: { email: session.user.email! },
          data: {
            id: session.user.id,
            name: session.user.name,
            image: session.user.image,
          }
        });
      } else {
        await prisma.user.create({
          data: {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.name,
            image: session.user.image,
            role: 'USER'
          }
        });
      }
    }

    const json = await request.json();
    const body = createWorkspaceSchema.parse(json);

    // Create the workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
      include: {
        members: true,
      },
    });

    // Return consistent shape
    return NextResponse.json({
      id: workspace.id,
      name: workspace.name,
      createdAt: workspace.createdAt,
    });
  } catch (error) {
    console.error("Error creating workspace:", error);
    return new NextResponse(
      JSON.stringify({ message: "Internal server error" }),
      { status: 500 }
    );
  }
}