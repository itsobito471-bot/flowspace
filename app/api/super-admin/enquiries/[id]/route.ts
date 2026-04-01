import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Enquiry } from "@/src/lib/models/Enquiry";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
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

    const enquiry = await Enquiry.findByIdAndUpdate(
      id,
      { status: body.status },
      { new: true }
    );

    if (!enquiry) {
      return NextResponse.json({ success: false, message: "Enquiry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: enquiry });
  } catch (error: any) {
    console.error("Super Admin Enquiry Update API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update enquiry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).userType !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    
    const { id } = await params;

    const enquiry = await Enquiry.findByIdAndDelete(id);

    if (!enquiry) {
      return NextResponse.json({ success: false, message: "Enquiry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Enquiry deleted successfully" });
  } catch (error: any) {
    console.error("Super Admin Enquiry Delete API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete enquiry" },
      { status: 500 }
    );
  }
}
