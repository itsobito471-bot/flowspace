import { NextResponse } from "next/server";
import dbConnect from "@/src/lib/mongodb";
import { Enquiry } from "@/src/lib/models/Enquiry";
import { sendThankYouEmail } from "@/src/lib/email";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    // Explicit server-side validation can be added here
    if (!body.full_name || !body.email || !body.company || !body.team_size) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const doc = await Enquiry.create({
      full_name: body.full_name,
      email: body.email,
      company: body.company,
      team_size: body.team_size,
      message: body.message,
      status: "NEW", // Explicit enforcement
    });

    // Send the async thank you email
    await sendThankYouEmail({
      to_email: body.email,
      name: body.full_name,
    });

    return NextResponse.json({ success: true, data: doc });
  } catch (error: any) {
    console.error("Enquiry API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
