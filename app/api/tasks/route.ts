import { verifyToken } from "@/lib/auth-helper";
import { prisma } from "@/lib/prisma";
import { TaskStatus, TaskPrority } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).default("TODO"),
  dueDate: z.string().datetime().optional(),
  teamId: z.string(),
  assignedToId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await verifyToken(request);
    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized - login" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validateData = createSchema.parse(body);

    const {
      title,
      description,
      priority,
      status,
      dueDate,
      teamId,
      assignedToId,
    } = validateData;

    // Check: User ei team er member kina
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: payload.userId,
          teamId: validateData.teamId,
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: "You are not a member of this team" },
        { status: 403 }
      );
    }

    if (validateData.assignedToId) {
      const assignedMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: validateData.assignedToId,
            teamId: validateData.teamId,
          },
        },
      });

      if (!assignedMember) {
        return NextResponse.json(
          { error: "Assigned user is not a member of this team" },
          { status: 400 }
        );
      }
    }

    const task = await prisma.task.create({
      data: {
        title: title,
        description: description,
        priority: priority,
        status: status,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: payload.userId,
        assignedToId: assignedToId,
        teamId: teamId,
      },
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
      },
    });

    return NextResponse.json(
      { error: "Task Created Successfully", task },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Create task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

//GET ALL Tasks

export async function GET(request: NextRequest) {
  try {
    const payload = await verifyToken(request);
    if (!payload) {
      return NextResponse.json(
        {
          error: "Unauthorized - login",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedToId = searchParams.get("assignedToId");

    type WhereConditions = {
      teamId?: string;
      status?: TaskStatus;
      assignedToId?: string;
      priority?: TaskPrority;
    };

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 }
      );
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: payload.userId,
          teamId: teamId,
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: "You are not a memeber of this team" },
        { status: 403 }
      );
    }

    const whereConditions: WhereConditions = {
      teamId: teamId,
    };

    if (status && Object.values(TaskStatus).includes(status as TaskStatus)) {
      whereConditions.status = status as TaskStatus;
    }

    if (
      priority &&
      Object.values(TaskPrority).includes(priority as TaskPrority)
    ) {
      whereConditions.priority = priority as TaskPrority;
    }

    if (assignedToId) {
      whereConditions.assignedToId = assignedToId;
    }

    const tasks = await prisma.task.findMany({
      where: whereConditions,
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
        _count:{
            select:{
                comments:true
            }
        }
      },
      orderBy:{
        createdAt:"desc"
      }
    });

    return NextResponse.json({tasks, count:tasks.length},{status:200})

  } catch (error) {
    console.error("Get tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
