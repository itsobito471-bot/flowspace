import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Attendance } from "@/src/lib/models/Attendance";
import { User } from "@/src/lib/models/User";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = (session.user as any).role?.level === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Forbidden: Only Admins can manually add time." }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, date, check_in, check_out, description } = body;

    if (!user_id || !date || !check_in || !description) {
      return NextResponse.json({ success: false, message: "Missing required fields." }, { status: 400 });
    }

    await dbConnect();

    // Verify user exists and belongs to the same organization
    const user = await User.findById(user_id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }
    if (user.organization_id?.toString() !== orgId) {
      return NextResponse.json({ success: false, message: "Forbidden: User does not belong to your organization." }, { status: 403 });
    }

    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const inDate = new Date(check_in);
    const outDate = check_out ? new Date(check_out) : null;

    if (outDate && inDate > outDate) {
      return NextResponse.json({ success: false, message: "Check-in time cannot be after check-out time." }, { status: 400 });
    }

    const newRecord = await Attendance.create({
      user_id: user._id,
      date: normalizedDate,
      check_in: inDate,
      check_out: outDate,
      status: "PRESENT",
      added_by: (session.user as any).id,
      description: description.trim(),
    });

    return NextResponse.json({ success: true, data: newRecord, message: "Manual time entry added successfully." });

  } catch (error: any) {
    console.error("Manual Attendance Add Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
