import { verifyToken } from "@/lib/auth-helper";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const addMemberSchema = z.object({
    email: z.string().email(),
    role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER")
});


export async function POST(request:NextRequest, {params}:{params:Promise<{ teamId: string }>}){
    try {
        const payload = await verifyToken(request);
        if(!payload){
            return NextResponse.json({error:"Unauthorized - login"}, {status:401})
        }


        const { teamId } = await params;


            // Check: Current user ei team er OWNER ba ADMIN kina
        const currentUserMembership = await prisma.teamMember.findUnique({
            where:{
                userId_teamId:{
                    userId:payload.userId,
                    teamId:teamId
                }
            }
        })


        if(!currentUserMembership){
            return NextResponse.json({error:"You are not amember of this team"},{status:403})
        }

        if(currentUserMembership.role!=="OWNER" && currentUserMembership.role!=="ADMIN"){
            return NextResponse.json({error:"ONly Owner and Admin can add members"},{status:403})
        }

        const body = await request.json();
        const {email,role} = addMemberSchema.parse(body);

        const userToAdd = await prisma.user.findUnique({where:{email}});

         if(!userToAdd){
            return NextResponse.json({error:"User with this email not found"}, {status:404})
         }


         const existingMember = await prisma.teamMember.findUnique({
            where:{
                userId_teamId:{
                    userId:userToAdd.id,
                    teamId:teamId
                }
            }
         });

         if(existingMember){
            return NextResponse.json({error:"User is already a member of this team"}, {status:400})
         }

         const newMember = await prisma.teamMember.create({
            data:{
                userId:userToAdd.id,
                teamId:teamId,
                role:role
            },
            include:{
                user:{
                    select:{
                        id:true,
                        name:true,
                        email:true
                    }
                }
            }
         });
         return NextResponse.json({message:"Member Added Successfully", member:newMember},{status:201})

    } catch (error) {
        if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Add member error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  
    }
}