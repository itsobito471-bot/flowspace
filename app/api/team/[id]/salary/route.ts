import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { SalaryLog } from "@/src/lib/models/SalaryLog";
import { User } from "@/src/lib/models/User";

export async function GET(request: Request, context: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const id = params.id;
    const isAdmin = (session.user as any).role?.level === "ADMIN";
    if (id !== (session.user as any).id && !isAdmin) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    // Fetch ALL logs sorted desc by date, so administrators have the full history.
    const salaryLogs = await SalaryLog.find({ user_id: id })
      .sort({ effective_date: -1, createdAt: -1 })
      .populate("changed_by", "name avatar")
      .lean();

    return NextResponse.json({ success: true, data: salaryLogs });
  } catch (error: any) {
    console.error("GET /api/team/[id]/salary Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request, context: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = (session.user as any).role?.level === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Forbidden: Only Admins can modify salary" }, { status: 403 });
    }

    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const id = params.id;
    const body = await request.json();
    const { amount, effective_date, breakdown = [] } = body;

    if (!amount || !effective_date) {
      return NextResponse.json({ success: false, message: "Amount and effective_date are required" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }
    if (user.organization_id?.toString() !== orgId) {
      return NextResponse.json({ success: false, message: "Forbidden: User not in your organization." }, { status: 403 });
    }

    const newSalaryLog = await SalaryLog.create({
      user_id: user._id,
      amount: Number(amount),
      breakdown: breakdown,
      effective_date: new Date(effective_date),
      changed_by: (session.user as any).id,
      organization_id: orgId,
    });

    return NextResponse.json({ success: true, data: newSalaryLog });
  } catch (error: any) {
    console.error("POST /api/team/[id]/salary Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = (session.user as any).role?.level === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Forbidden: Only Admins can modify salary" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const logId = searchParams.get("logId");
    if (!logId) {
      return NextResponse.json({ success: false, message: "logId query param is required" }, { status: 400 });
    }

    const body = await request.json();
    const { amount, effective_date, breakdown = [] } = body;

    if (!amount || !effective_date) {
      return NextResponse.json({ success: false, message: "Amount and effective_date are required" }, { status: 400 });
    }

    await dbConnect();

    const updated = await SalaryLog.findByIdAndUpdate(
      logId,
      {
        amount: Number(amount),
        breakdown,
        effective_date: new Date(effective_date),
        changed_by: (session.user as any).id,
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, message: "Salary log not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("PATCH /api/team/[id]/salary Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = (session.user as any).role?.level === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Forbidden: Only Admins can delete salary entries" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const logId = searchParams.get("logId");
    if (!logId) {
      return NextResponse.json({ success: false, message: "logId query param is required" }, { status: 400 });
    }

    await dbConnect();

    const deleted = await SalaryLog.findByIdAndDelete(logId);
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Salary log not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Salary log deleted" });
  } catch (error: any) {
    console.error("DELETE /api/team/[id]/salary Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
