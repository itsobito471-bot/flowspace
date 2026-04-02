import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Attendance } from "@/src/lib/models/Attendance";

/**
 * POST /api/comp-off/claim
 * Body: { attendanceId: string }
 *
 * Allows an employee to claim a comp-off for an eligible attendance record
 * they own. Moves the status from ELIGIBLE → PENDING_APPROVAL.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { attendanceId } = body;

    if (!attendanceId) {
      return NextResponse.json({ success: false, message: "attendanceId is required." }, { status: 400 });
    }

    await dbConnect();

    const record = await Attendance.findById(attendanceId);

    if (!record) {
      return NextResponse.json({ success: false, message: "Attendance record not found." }, { status: 404 });
    }

    // Security: ensure this record belongs to the requesting user
    if (record.user_id.toString() !== userId) {
      return NextResponse.json({ success: false, message: "Forbidden: This record does not belong to you." }, { status: 403 });
    }

    // Only ELIGIBLE records can be claimed
    if (record.comp_off_status !== "ELIGIBLE") {
      return NextResponse.json(
        { success: false, message: `Cannot claim: record status is "${record.comp_off_status}", expected "ELIGIBLE".` },
        { status: 409 }
      );
    }

    record.comp_off_status = "PENDING_APPROVAL";
    await record.save();

    return NextResponse.json({
      success: true,
      message: "Comp Off claimed successfully. Awaiting admin approval.",
      data: { _id: record._id, comp_off_status: record.comp_off_status },
    });
  } catch (error: any) {
    console.error("Comp Off Claim Error:", error);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}
