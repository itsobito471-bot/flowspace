import { NextResponse } from "next/server";
import dbConnect from "@/src/lib/mongodb";
import { User } from "@/src/lib/models/User";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    // Secure the endpoint using NEXTAUTH_SECRET from Vercel's env
    const expectedSecret = process.env.NEXTAUTH_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please provide the correct secret." },
        { status: 401 }
      );
    }

    await dbConnect();

    // Check if a Super Admin already exists
    const existingAdmin = await User.findOne({ user_type: "SUPER_ADMIN" });
    if (existingAdmin) {
      return NextResponse.json({
        success: true,
        message: `Super Admin already exists: ${existingAdmin.email}`,
      });
    }

    const name = process.env.SUPER_ADMIN_NAME || "FlowSpace Master";
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD is not set in environment variables." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password.trim(), 12);

    const admin = await User.create({
      name: name.trim(),
      email: email.trim(),
      passwordHash,
      user_type: "SUPER_ADMIN",
      is_active: true,
    });

    return NextResponse.json({
      success: true,
      message: "Super Admin seeded successfully in Vercel!",
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error: any) {
    console.error("Super Admin Seeding API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Seeding failed." },
      { status: 500 }
    );
  }
}
