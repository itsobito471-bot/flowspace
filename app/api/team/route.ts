import { NextResponse } from "next/server";
import dbConnect from "@/src/lib/mongodb";
import { User } from "@/src/lib/models/User";
import "@/src/lib/models/Role"; // ensure Role schema is registered for .populate()
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await dbConnect();

    const users = await User.find({})
      .populate("role_id", "title department level") // only pull the fields we need
      .select("name email is_active role_id createdAt employee_id date_of_joining")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json({ success: true, data: users }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/team]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch team members." },
      { status: 500 }
    );
  }
}


// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { name, email, password, role_id, employee_id, date_of_joining } = body;

    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password.trim(), 12);

    const newUser = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      employee_id: employee_id ? employee_id.trim() : undefined,
      date_of_joining: date_of_joining ? new Date(date_of_joining) : undefined,
      role_id: role_id || undefined,
      earned_flex_leaves: 0,
      is_active: true,
    });

    // Re-fetch with populated role so the UI can add the row immediately
    const populated = await User.findById(newUser._id)
      .populate("role_id", "title department level")
      .select("name email is_active role_id createdAt employee_id date_of_joining")
      .lean()
      .exec();

    return NextResponse.json(
      { success: true, message: "Employee added successfully.", data: populated },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/team]", error);

    // MongoDB duplicate key (email already exists)
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "An employee with that email already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message ?? "Failed to add employee." },
      { status: 500 }
    );
  }
}
