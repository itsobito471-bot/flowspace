import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { SubscriptionPlan } from "@/src/lib/models/SubscriptionPlan";

function isSuperAdmin(session: any) {
  return session?.user?.userType === "SUPER_ADMIN";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin(session)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
    await dbConnect();
    const plans = await SubscriptionPlan.find({}).sort({ price: 1 }).lean();
    return NextResponse.json({ success: true, data: plans });
  } catch (error: any) {
    console.error("GET /api/super-admin/plans Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin(session)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const { name, price, max_users, features = [] } = body;
    if (!name || price === undefined || !max_users) {
      return NextResponse.json({ success: false, message: "name, price and max_users are required" }, { status: 400 });
    }
    await dbConnect();
    const plan = await SubscriptionPlan.create({ name, price: Number(price), max_users: Number(max_users), features });
    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/super-admin/plans Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin(session)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("planId");
    if (!planId) return NextResponse.json({ success: false, message: "planId required" }, { status: 400 });
    await dbConnect();
    await SubscriptionPlan.findByIdAndDelete(planId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/super-admin/plans Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
