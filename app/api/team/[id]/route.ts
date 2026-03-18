import { NextResponse } from "next/server";
import dbConnect from "@/src/lib/mongodb";
import { User } from "@/src/lib/models/User";
import "@/src/lib/models/Role"; // Ensure Role schema is registered
import mongoose from "mongoose";

export async function PATCH(request: Request, context: any) {
  try {
    await dbConnect();
    
    // Safely await params to support both Next.js 14 and 15
    const params = await context.params;
    const id = params.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid user ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, role_id, is_active } = body;

    const updates: any = {};
    if (name) updates.name = name.trim();
    if (email) updates.email = email.trim().toLowerCase();
    if (role_id !== undefined) updates.role_id = role_id ? role_id : null;
    if (is_active !== undefined) updates.is_active = is_active;

    const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true })
      .populate("role_id", "title department level")
      .select("-passwordHash")
      .lean()
      .exec();

    if (!updatedUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User updated successfully", data: updatedUser }, { status: 200 });
  } catch (error: any) {
    console.error("[PATCH /api/team/[id]]", error);
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "An employee with that email already exists." }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: "Failed to update user." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    await dbConnect();
    
    const params = await context.params;
    const id = params.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid user ID" }, { status: 400 });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/team/[id]]", error);
    return NextResponse.json({ success: false, message: "Failed to delete user." }, { status: 500 });
  }
}
