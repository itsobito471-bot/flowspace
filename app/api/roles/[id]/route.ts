import { NextResponse } from "next/server";
import dbConnect from "@/src/lib/mongodb";
import { Role } from "@/src/lib/models/Role";
import { User } from "@/src/lib/models/User";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }) };
  const isAdmin = (session.user as any)?.role?.level === "ADMIN";
  if (!isAdmin) return { error: NextResponse.json({ success: false, message: "Forbidden: Admins only." }, { status: 403 }) };
  return { session };
}

export async function PATCH(request: Request, context: any) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    await dbConnect();
    
    const params = await context.params;
    const id = params.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid role ID" }, { status: 400 });
    }

    const body = await request.json();
    const { title, department, level } = body;

    const updates: any = {};
    if (title) updates.title = title.trim();
    if (department) updates.department = department.trim();
    if (level && ["ADMIN", "EMPLOYEE"].includes(level)) updates.level = level;

    const updatedRole = await Role.findByIdAndUpdate(id, updates, { new: true }).lean().exec();

    if (!updatedRole) {
      return NextResponse.json({ success: false, message: "Role not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Role updated successfully", data: updatedRole }, { status: 200 });
  } catch (error: any) {
    console.error("[PATCH /api/roles/[id]]", error);
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "A role with that title already exists." }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: "Failed to update role." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    await dbConnect();
    
    const params = await context.params;
    const id = params.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid role ID" }, { status: 400 });
    }

    // Check if users exist with this role
    const usersWithRoleCount = await User.countDocuments({ role_id: id });
    if (usersWithRoleCount > 0) {
      return NextResponse.json(
        { success: false, message: `Cannot delete role. It is currently assigned to ${usersWithRoleCount} user(s).` },
        { status: 400 }
      );
    }

    const deletedRole = await Role.findByIdAndDelete(id);

    if (!deletedRole) {
      return NextResponse.json({ success: false, message: "Role not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Role deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/roles/[id]]", error);
    return NextResponse.json({ success: false, message: "Failed to delete role." }, { status: 500 });
  }
}

