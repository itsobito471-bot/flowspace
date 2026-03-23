import { NextResponse } from "next/server";
import dbConnect from "@/src/lib/mongodb";
import { User } from "@/src/lib/models/User";
import "@/src/lib/models/Role"; // ensure Role schema is registered for .populate()
import { Attendance } from "@/src/lib/models/Attendance";
import bcrypt from "bcryptjs";

function getTodayDate() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    const [users, totalCount] = await Promise.all([
      User.find({})
        .populate("role_id", "title department level")
        .select("name email is_active role_id createdAt employee_id date_of_joining")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      User.countDocuments({}),
    ]);

    const today = getTodayDate();
    const userIds = users.map(u => u._id);
    const attendances = await Attendance.find({ date: today, user_id: { $in: userIds } }).sort({ check_in: -1 }).lean();

    const usersWithAttendance = users.map(u => {
      const record = attendances.find(a => String(a.user_id) === String(u._id));
      return {
        ...u,
        today_attendance: record ? {
          check_in: record.check_in,
          check_out: record.check_out,
          status: record.status
        } : null
      };
    });

    return NextResponse.json({
      success: true,
      data: usersWithAttendance,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    }, { status: 200 });
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
