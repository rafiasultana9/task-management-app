import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function verifyToken(request: NextRequest){
try {
    const token = request.cookies.get("token")?.value;

    if(!token){
        return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-this");

    const {payload} = await jwtVerify(token,secret);

    return payload as {userId: string , email:string , role:string};
} catch (error) {
    console.error("Token Verification Failed", error);
}

}