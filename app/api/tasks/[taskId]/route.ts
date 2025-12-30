import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth-helper";
import { Prisma } from "@prisma/client";


export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const payload = await verifyToken(request);
    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    const {taskId} = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: payload.userId,
          teamId: task.teamId!,
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: "You are not a member of this team" },
        { status: 403 }
      );
    }

    return NextResponse.json({ task }, { status: 200 });
  } catch (error) {
    console.error("Get task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request:NextRequest, {params}:{params:{taskId:string}}
){
try {
  
  const payload = await verifyToken(request);
  if(!payload){
    return NextResponse.json({error:"Unauthorized - login"},{status: 401})
  }
    const {taskId} = await params;


    // Check: Task exist kore kina
    const existingTask = await prisma.task.findUnique({
      where:{id:taskId}
    });

    if(!existingTask){
      return NextResponse.json({error:"Task Not Found."},{status:404})
    }
    
    const teamMember = await prisma.teamMember.findUnique({
      where:{
        userId_teamId:{
          userId:payload.userId,
          teamId: existingTask.teamId!
        }
      }
    });


    if(!teamMember){
      return NextResponse.json({error:"You are not a member of this team."}, {status:403})
    };


    const body = await request.json();
    const {title, description, status, dueDate, priority,assignedToId} = body

    const updateData:Prisma.TaskUpdateInput = {}

    if(title !== undefined){
      updateData.title = title;
    }

    if(description !== undefined){
      updateData.description = description;
    }

    if(status !== undefined){
      updateData.status =  status;
    }

    if(dueDate !== undefined){
      updateData.dueDate = dueDate;
    }

    if(priority !== undefined){
      updateData.priority = priority;
    }

    if(assignedToId !== undefined){
      if(assignedToId){
        const assignedMember = await prisma.teamMember.findUnique({
          where:{
            userId_teamId:{
              userId:assignedToId,
              teamId:existingTask.teamId!
            }
          }
        });

        if(!assignedMember){
          return NextResponse.json({
            error: "Assigned user is not a emember of this team."
          },{status:400})
        }
       updateData.assignedTo = {
      connect: { id: assignedToId },
    };
      }
      else {
    updateData.assignedTo = {
      disconnect: true,
    };
  }
}


    const updatedTask = await prisma.task.update({
      where:{id: taskId},
      data: updateData,
      include:{
        createdBy:{
          select:{
            id:true, name:true, email:true
          }
        },
        assignedTo:{
          select:{
              id:true, name:true, email:true
          }
        },
        team:{
          select:{
            id:true,name:true, 
          }
        }
      }
    });

    return NextResponse.json({
      message:"Task updated successfully.",task:updatedTask
    },{status:200})

} catch (error) {
  console.error("Update task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
}
}

export async function DELETE(request:NextRequest, 
  {params}:{params:{taskId:string}}){

   try {
    
     const payload = await verifyToken(request);
     if(!payload){
      return NextResponse.json({error:"Unauthorized - Please login"},{status:401})
     }
    const {taskId} = await params;

    const existingTask = await prisma.task.findUnique({
     where:{id:taskId},
    })
  
    if(!existingTask){
      return NextResponse.json({error:"Task not found."},{status:404})
    }
    
    const teamMember = await prisma.teamMember.findUnique({
      where:{
        userId_teamId:{
        userId:payload.userId,
        teamId:existingTask.teamId!
      }}
    })

    if(!teamMember){
 return NextResponse.json({error:"You are not a member of this team."},{status:403})
    }


    const canDelete = existingTask.createdById === payload.userId || teamMember.role === "OWNER" || teamMember.role === "ADMIN";

   if(!canDelete){
    return NextResponse.json({error:"You dont have permission to delete this task"},{status:403})
   }

   await prisma.task.delete({where:{id:taskId}});

   return NextResponse.json({
    message:"Task deleted successfully"
   }, {status:200})

   } catch (error) {
      console.error("Delete task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
   }

}