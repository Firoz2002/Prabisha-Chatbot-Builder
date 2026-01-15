import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    
    return NextResponse.json({ message: "Knowledge bases updated successfully" });
  } catch (error) {
    console.error("Error updating knowledge bases:", error);
    return NextResponse.json({ error: "Failed to update knowledge bases" }, { status: 500 });
  }
}