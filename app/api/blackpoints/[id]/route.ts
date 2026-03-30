import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { BlackPoint } from "@/src/lib/models/BlackPoint";

export async function DELETE(
    request: Request,
    context: any // We use 'any' here to prevent strict TypeScript errors between Next 14 and 15
) {
    try {
        // 1. Security Check
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as any)?.role?.level;

        if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
            return NextResponse.json({ success: false, message: "Forbidden: Admin access required." }, { status: 403 });
        }

        // 🚨 THE BULLETPROOF FIX 🚨
        // First, we safely await the params (Required for Next.js 15+)
        const params = await context.params;
        let demeritId = params?.id;

        // Second, if the params object is entirely missing, we forcefully extract the ID directly from the URL string!
        if (!demeritId) {
            demeritId = request.url.split("/").pop(); // Grabs the last part of /api/blackpoints/12345
        }

        if (!demeritId) {
            return NextResponse.json({ success: false, message: "Demerit ID is required." }, { status: 400 });
        }

        await dbConnect();

        // 2. Fetch the specific demerit
        const demerit = await BlackPoint.findById(demeritId);

        if (!demerit) {
            return NextResponse.json({ success: false, message: "Demerit not found." }, { status: 404 });
        }

        // 3. THE FINANCIAL AUDIT LOCK
        if (demerit.is_resolved) {
            return NextResponse.json({
                success: false,
                message: "Action denied: This demerit has already been processed into a payroll deduction and cannot be deleted."
            }, { status: 403 });
        }

        // 4. Safe to delete!
        await BlackPoint.findByIdAndDelete(demeritId);

        return NextResponse.json({ success: true, message: "Demerit deleted successfully." });

    } catch (error: any) {
        console.error("DELETE /api/blackpoints/[id] Error:", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}