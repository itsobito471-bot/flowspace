import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Attendance } from "@/src/lib/models/Attendance";
import { User } from "@/src/lib/models/User";
import mongoose from "mongoose";

/**
 * POST /api/comp-off/approve
 * Body: { attendanceId: string; status: "APPROVED" | "REJECTED" }
 *
 * Admin-only. Approves or rejects a pending comp-off claim.
 * On APPROVED: updates comp_off_status to APPROVED and atomically
 * increments the employee's earned_comp_offs by 1.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = (session.user as any)?.role?.level === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Forbidden: Admin access required." }, { status: 403 });
    }

    const orgId = session.user.orgId as string;
    if (!orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { attendanceId, status } = body;

    if (!attendanceId) {
      return NextResponse.json({ success: false, message: "attendanceId is required." }, { status: 400 });
    }
    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json({ success: false, message: "status must be 'APPROVED' or 'REJECTED'." }, { status: 400 });
    }

    await dbConnect();

    const record = await Attendance.findById(attendanceId);

    if (!record) {
      return NextResponse.json({ success: false, message: "Attendance record not found." }, { status: 404 });
    }

    // Admins can only manage records within their own org
    if (record.organization_id.toString() !== orgId) {
      return NextResponse.json({ success: false, message: "Forbidden: This record is not in your organization." }, { status: 403 });
    }

    // Only PENDING_APPROVAL records can be acted upon
    if (record.comp_off_status !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { success: false, message: `Cannot act: record status is "${record.comp_off_status}", expected "PENDING_APPROVAL".` },
        { status: 409 }
      );
    }

    record.comp_off_status = status;
    await record.save();

    // If approved, atomically increment the employee's comp off balance
    if (status === "APPROVED") {
      await User.findByIdAndUpdate(
        record.user_id,
        { $inc: { earned_comp_offs: 1 } },
        { new: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Comp Off ${status === "APPROVED" ? "approved" : "rejected"} successfully.`,
      data: { _id: record._id, comp_off_status: record.comp_off_status },
    });
  } catch (error: any) {
    console.error("Comp Off Approve Error:", error);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}

/**
 * GET /api/comp-off/approve
 * Returns all attendance records where comp_off_status === "PENDING_APPROVAL"
 * for the admin's organization. Used to populate the Admin Approval Queue.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = (session.user as any)?.role?.level === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Forbidden: Admin access required." }, { status: 403 });
    }

    const orgId = session.user.orgId as string;
    if (!orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const pendingRecords = await Attendance.find({
      organization_id: new mongoose.Types.ObjectId(orgId),
      comp_off_status: "PENDING_APPROVAL",
    })
      .populate("user_id", "name email avatar employee_id")
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({ success: true, data: pendingRecords });
  } catch (error: any) {
    console.error("Comp Off Queue Fetch Error:", error);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}
