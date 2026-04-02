import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { User } from "@/src/lib/models/User";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// GET /api/profile — returns the current user's own profile data (excluding passwordHash)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById((session.user as any).id)
      .select("-passwordHash")
      .lean();

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/profile
// Designed to accept multpart/form-data
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const formData = await request.formData();
    const name = formData.get("name") as string | null;
    const file = formData.get("avatar") as File | null;

    const updates: any = {};
    if (name && name.trim().length > 0) {
      updates.name = name.trim();
    }

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate a clean filename tying it to the user so it just overwrites or cleans up easily (basic security against path traversal)
      const ext = file.name.split('.').pop() || "png";
      const filename = `${session?.user?.name?.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;
      
      const uploadDir = join(process.cwd(), "public", "avatars");
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (e) {
        // Directory may already exist
      }

      const filepath = join(uploadDir, filename);
      await writeFile(filepath, buffer);

      // Save public URL path bridging public Next.JS static fetching standard
      updates.avatar = `/avatars/${filename}`;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, message: "No updates provided." }, { status: 400 });
    }

    const updatedUser = await User.findByIdAndUpdate(
      (session.user as any).id,
      { $set: updates },
      { new: true }
    ).select("-passwordHash");

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
