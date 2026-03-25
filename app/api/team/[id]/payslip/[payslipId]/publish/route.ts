import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Payslip } from "@/src/lib/models/Payslip";

export async function PATCH(request: Request, context: any) {
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
    const { id, payslipId } = params;

    await dbConnect();

    // Toggle PUBLISHED to PAID or vice versa, or just always set to PUBLISHED. Let's toggle.
    const payslip = await Payslip.findById(payslipId);
    if (!payslip) {
      return NextResponse.json({ success: false, message: "Payslip not found" }, { status: 404 });
    }

    payslip.status = payslip.status === "PUBLISHED" ? "PAID" : "PUBLISHED";
    await payslip.save();

    return NextResponse.json({ success: true, data: payslip });
  } catch (error: any) {
    console.error("PATCH /api/team/[id]/payslip/[payslipId]/publish Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
