import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { WFHRequest } from "@/src/lib/models/WFHRequest";
import mongoose from "mongoose";

// ── GET /api/wfh-requests  (Admin: all requests; Employee: own requests)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const userId = (session.user as any).id as string;
    const orgId = session.user.orgId as string;
    const roleLevel = (session.user as any)?.role?.level as string;
    const isAdmin = roleLevel === "ADMIN" || roleLevel === "SUPER_ADMIN";

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // optional filter

    const filter: any = { organization_id: new mongoose.Types.ObjectId(orgId) };
    if (!isAdmin) filter.user_id = new mongoose.Types.ObjectId(userId); // employees see only their own
    if (status) filter.status = status;

    const requests = await WFHRequest.find(filter)
      .populate("user_id", "name email employee_id avatar")
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({ success: true, data: requests });
  } catch (error: any) {
    console.error("[GET /api/wfh-requests]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ── POST /api/wfh-requests  (Employee submits a new WFH request)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const userId = (session.user as any).id as string;
    const orgId = session.user.orgId as string;

    const body = await request.json();
    const { date, reason } = body;

    if (!date || !reason?.trim()) {
      return NextResponse.json({ success: false, message: "Date and reason are required." }, { status: 400 });
    }

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    // Prevent duplicate requests for the same day
    const existing = await WFHRequest.findOne({
      user_id: new mongoose.Types.ObjectId(userId),
      date: targetDate,
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "You already have a WFH request for this date." },
        { status: 409 }
      );
    }

    const newRequest = await WFHRequest.create({
      user_id: new mongoose.Types.ObjectId(userId),
      organization_id: new mongoose.Types.ObjectId(orgId),
      date: targetDate,
      reason: reason.trim(),
      status: "PENDING",
    });

    return NextResponse.json({ success: true, data: newRequest }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/wfh-requests]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
