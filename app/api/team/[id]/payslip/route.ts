import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Payslip } from "@/src/lib/models/Payslip";
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

    const query: any = { user_id: id };
    if (!isAdmin) {
      query.status = "PUBLISHED";
    }

    const payslips = await Payslip.find(query)
      .sort({ year: -1, month: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: payslips });
  } catch (error: any) {
    console.error("GET /api/team/[id]/payslip Error:", error);
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
      return NextResponse.json({ success: false, message: "Forbidden: Only Admins can modify payslips" }, { status: 403 });
    }

    const params = await context.params;
    const id = params.id;
    const body = await request.json();
    const { month, year, additions = [], deductions = [] } = body;

    if (!month || !year) {
      return NextResponse.json({ success: false, message: "Month and Year are required" }, { status: 400 });
    }

    await dbConnect();

    // Verify user exists
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Get the base salary for this specific month/year.
    // For a generated payslip, we snapshot the active salary at the end of the specified month.
    // Assuming effective_date must be before or on the last day of the payload's month.
    const lastDayOfMonth = new Date(year, month, 0);
    
    const latestSalary = await SalaryLog.findOne({
      user_id: user._id,
      effective_date: { $lte: lastDayOfMonth }
    })
      .sort({ effective_date: -1, createdAt: -1 })
      .lean();

    const base_salary = latestSalary ? latestSalary.amount : 0;

    // Calculate net pay
    const totalAdditions = additions.reduce((sum: number, a: { amount: number }) => sum + Number(a.amount || 0), 0);
    const totalDeductions = deductions.reduce((sum: number, d: { amount: number }) => sum + Number(d.amount || 0), 0);
    const net_pay = base_salary + totalAdditions - totalDeductions;

    const newPayslip = await Payslip.create({
      user_id: user._id,
      month: Number(month),
      year: Number(year),
      base_salary,
      additions,
      deductions,
      net_pay,
      status: "PAID", // Defaulting to PAID or could accept from body
    });

    return NextResponse.json({ success: true, data: newPayslip });
  } catch (error: any) {
    console.error("POST /api/team/[id]/payslip Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
