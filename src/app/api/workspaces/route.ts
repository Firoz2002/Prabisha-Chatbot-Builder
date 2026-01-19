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

    let workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      }
    });

    // If user has no workspaces, create a default one
    if (workspaces.length === 0) {
      const newWorkspace = await prisma.workspace.create({
        data: {
          name: "Default Workspace",
        },
      });

      await prisma.workspaceMember.create({
        data: {
          userId: session.user.id,
          workspaceId: newWorkspace.id,
          role: "OWNER"
        }
      });

      // Return the newly created workspace
      return NextResponse.json([{
        id: newWorkspace.id,
        name: newWorkspace.name,
        createdAt: newWorkspace.createdAt,
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