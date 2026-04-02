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

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.name || !body.role || !body.quote) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const doc = await Testimonial.create({
      name: body.name,
      role: body.role,
      quote: body.quote,
      avatar: body.avatar || body.name.substring(0, 2).toUpperCase(),
      status: "PENDING", // Requires super admin approval before display
    });

    return NextResponse.json({ success: true, data: doc });
  } catch (error: any) {
    console.error("Testimonial POST Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
