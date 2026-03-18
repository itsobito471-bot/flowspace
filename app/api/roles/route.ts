import { NextResponse } from "next/server";
import dbConnect from "@/src/lib/mongodb";
import { Role } from "@/src/lib/models/Role";

// ── GET — list all roles ─────────────────────────────────────────────────────
export async function GET() {
  try {
    await dbConnect();
    const roles = await Role.find({}).sort({ level: -1 }).lean().exec();
    return NextResponse.json({ success: true, data: roles }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/roles]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch roles." },
      { status: 500 }
    );
  }
}

// ── POST — create a new role ─────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { title, department, level } = body;

    if (!title?.trim() || !department?.trim() || !level) {
      return NextResponse.json(
        { success: false, message: "Title, department, and level are required." },
        { status: 400 }
      );
    }

    if (!["ADMIN", "EMPLOYEE"].includes(level)) {
      return NextResponse.json(
        { success: false, message: "Level must be ADMIN or EMPLOYEE." },
        { status: 400 }
      );
    }

    const role = await Role.create({
      title: title.trim(),
      department: department.trim(),
      level,
    });

    return NextResponse.json(
      { success: true, message: "Role created successfully.", data: role },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/roles]", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "A role with that title already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message ?? "Failed to create role." },
      { status: 500 }
    );
  }
}
