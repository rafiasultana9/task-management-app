import { verifyToken } from "@/lib/auth-helper";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request:NextRequest){
    try {

        const payload = await verifyToken(request);

        if(!payload){
            return NextResponse.json({error:"Unauthorized- log in"}, {status:401})
        }

         const user = await prisma.user.findUnique({
            where: {id:payload.userId},
            select:{
                id:true,
                name:true,
                email:true,
                role:true,
                image:true,
                createdAt:true,
                updatedAt:true
            }
        });

        if(!user){
         const response =  NextResponse.json({error:"User not found"}, {status:404});
         response.cookies.delete("token");
         return response;
        }
        return NextResponse.json({user}, {status:200})
        
    } catch (error) {
        console.error("GET User Error",error);
        return NextResponse.json({error:"Internal Server Error"}, {status:500})
    }
}