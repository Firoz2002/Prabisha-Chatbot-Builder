import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const knowledgeBases = await prisma.knowledgeBase.findMany();
        return NextResponse.json(knowledgeBases);
    } catch (error) {
        console.error("Failed to fetch knowledge bases:", error);
        return NextResponse.json(
            { error: "Failed to fetch knowledge bases" },
            { status: 500 }
        );
    }
}