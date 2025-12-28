import { verifyToken } from "@/lib/auth-helper";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

//GET TEAM BY CURRENT USER
export async function GET(request:NextRequest){
    try {
        const payload = await verifyToken(request);

        if(!payload){
        return NextResponse.json({error:"Unauthorized -login"},{status:401})
        }

      const teams = await prisma.team.findMany({
        where:{
            members:{
                some:{
                    userId : payload.userId
                }
            }
        },
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
      })

      return NextResponse.json({teams},{status:200})
    } catch (error) {
        console.error(error);
        return NextResponse.json({error:"Internal Server Error"}, {status:500})
    }
}