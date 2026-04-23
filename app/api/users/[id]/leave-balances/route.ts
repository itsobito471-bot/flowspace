import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { User } from "@/src/lib/models/User";
import { CompanySettings } from "@/src/lib/models/Settings";
import "@/src/lib/models/Role";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const user = await User.findById(id).lean();
    if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    const settings = await CompanySettings.findOne({ organization_id: user.organization_id }).lean();
    const settingsLeaves = settings?.leave_types || [];

    const currentBalances = (user as any).leave_balances || [];

    // Merge them
    const combined = settingsLeaves.map((st: any) => {
      const match = currentBalances.find((cb: any) => String(cb.leave_type_id) === String(st._id));
      return {
        leave_type_id: st._id,
        name: st.name,
        total_allowance: match ? match.total_allowance : st.default_allowance,
        consumed: match ? match.consumed : 0,
      };
    });

    return NextResponse.json({ success: true, data: combined });
  } catch (error) {
    console.error("[GET /api/users/[id]/leave-balances]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as any)?.role?.level !== "ADMIN" && (session.user as any)?.role?.level !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, message: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ success: false, message: "Expected an array of leave balances" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Iterate and update total_allowance
    const currentBalances = user.leave_balances || [];
    
    body.forEach((updateItem: any) => {
      const matchIndex = currentBalances.findIndex(
        (b) => String(b.leave_type_id) === String(updateItem.leave_type_id)
      );

      if (matchIndex >= 0) {
        // Update existing
        currentBalances[matchIndex].total_allowance = updateItem.total_allowance;
      } else {
        // Add new
        currentBalances.push({
          leave_type_id: updateItem.leave_type_id,
          total_allowance: updateItem.total_allowance,
          consumed: 0,
        } as any);
      }
    });

    user.leave_balances = currentBalances;
    await user.save();

    return NextResponse.json({ success: true, message: "Leave balances updated successfully." });
  } catch (error: any) {
    console.error("[PATCH /api/users/[id]/leave-balances]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
