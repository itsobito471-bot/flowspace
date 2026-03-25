import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Attendance } from "@/src/lib/models/Attendance";
import { User } from "@/src/lib/models/User"; // Ensure User is registered for populate

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    if (!targetUserId) {
      return NextResponse.json({ success: false, message: "Missing userId parameter" }, { status: 400 });
    }

    const isAdmin = (session.user as any).role?.level === "ADMIN";
    if (targetUserId !== (session.user as any).id && !isAdmin) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    // Admins can only view logs for users in their own org
    if (isAdmin && targetUserId !== (session.user as any).id) {
      const targetUser = await User.findById(targetUserId).select("organization_id").lean();
      if (!targetUser || (targetUser as any).organization_id?.toString() !== orgId) {
        return NextResponse.json({ success: false, message: "Forbidden: User not in your organization." }, { status: 403 });
      }
    }

    await dbConnect();

    const [attendance, totalCount] = await Promise.all([
      Attendance.find({ user_id: targetUserId })
        .populate("added_by", "name email")
        .sort({ date: -1, check_in: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Attendance.countDocuments({ user_id: targetUserId }),
    ]);

    return NextResponse.json({
      success: true,
      data: attendance,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });

  } catch (error: any) {
    console.error("Attendance Log Fetch Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
