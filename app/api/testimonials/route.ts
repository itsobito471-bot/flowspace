import { NextResponse } from "next/server";
import dbConnect from "@/src/lib/mongodb";
import { Testimonial } from "@/src/lib/models/Testimonial";

export async function GET(request: Request) {
  try {
    await dbConnect();

    // The landing page only shows explicitly APPROVED testimonials
    const docs = await Testimonial.find({ status: "APPROVED" })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: docs });
  } catch (error: any) {
    console.error("Testimonials API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch testimonials" },
      { status: 500 }
    );
  }
}
