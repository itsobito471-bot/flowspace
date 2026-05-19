import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Testimonial } from "@/src/lib/models/Testimonial";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).userType !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    
    if (!body.status) {
      return NextResponse.json({ success: false, message: "Status is required" }, { status: 400 });
    }

    const { id } = await params;

    const testimonial = await Testimonial.findByIdAndUpdate(
      id,
      { status: body.status },
      { new: true }
    );

    if (!testimonial) {
      return NextResponse.json({ success: false, message: "Testimonial not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: testimonial });
  } catch (error: any) {
    console.error("Super Admin Testimonial Update API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update testimonial" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).userType !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    
    const { id } = await params;

    const testimonial = await Testimonial.findByIdAndDelete(id);

    if (!testimonial) {
      return NextResponse.json({ success: false, message: "Testimonial not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Testimonial deleted successfully" });
  } catch (error: any) {
    console.error("Super Admin Testimonial Delete API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete testimonial" },
      { status: 500 }
    );
  }
}
