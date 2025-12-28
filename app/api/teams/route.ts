import { verifyToken } from "@/lib/auth-helper";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const createTeamSchema =  z.object({
name:z.string().min(2).max(100),
description: z.string().max(500).optional(),
})

//CREATE TEAM
export async function POST (request: NextRequest){
    try {
        const payload = await verifyToken(request);

        if(!payload){
            return NextResponse.json({error:"Unauthorized-login"},{status:401})
        }

        const body = await request.json();
        const {name, description} = createTeamSchema.parse(body);

        const team = await prisma.team.create({
            data:{name,description}
        });

        await prisma.teamMember.create({
            data:{
                userId: payload.userId,
                teamId:team.id,
                role:"OWNER"
                
            }
        });

        const teamWithMembers = await prisma.team.findUnique({
            where:{id:team.id},
            include:{
                members:{
                    include:{
                        user:{
                            select:{
                                id:true,
                                email:true,
                                name:true
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json({message:"Team Created Successfully",team:teamWithMembers},{status:201})


    } catch (error) {
        if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Create team error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  
    }
}


// **
//  * GET /api/teams
//  * Get ALL teams (Admin only - optional)
//  * This is for admin dashboard to see all teams
//  */
export async function GET(request: NextRequest) {
  try {
    // 1. User check
    const payload = await verifyToken(request);
    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    // 2. Check if user is ADMIN (optional - security)
    if (payload.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access only" },
        { status: 403 }
      );
    }

    // 3. Fetch ALL teams from database
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ teams }, { status: 200 });
  } catch (error) {
    console.error("Get all teams error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}