import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Testimonial } from "@/src/lib/models/Testimonial";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).userType !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const docs = await Testimonial.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: docs });
  } catch (error: any) {
    console.error("Super Admin Testimonials API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch testimonials" },
      { status: 500 }
    );
  }
}
