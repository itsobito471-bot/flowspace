/**
 * seed-super-admin.ts
 *
 * Creates the initial SUPER_ADMIN User in MongoDB for the Multi-Tenant architecture.
 * Reads credentials from the .env file so nothing sensitive is hard-coded.
 *
 * Usage:
 * npx tsx scripts/seed-super-admin.ts
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import * as path from "path";
import * as dotenv from "dotenv";

// ── Load .env from project root ──────────────────────────────────────────────
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ── Inline lightweight schema (avoids Next.js module graph issues) ──────────
const UserSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
        // Multi-tenant specific fields
        user_type: { type: String, enum: ["SUPER_ADMIN", "ORG_USER"], default: "ORG_USER" },
        organization_id: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
        is_active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

// ── Read credentials from env ─────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI?.trim();
const SUPER_ADMIN_NAME = (process.env.SUPER_ADMIN_NAME ?? "FlowSpace Master").trim();
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "").trim();
const SUPER_ADMIN_PASSWORD = (process.env.SUPER_ADMIN_PASSWORD ?? "").trim();

if (!MONGODB_URI) {
    console.error("❌  MONGODB_URI is not set in .env");
    process.exit(1);
}
if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
    console.error("❌  SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in .env");
    process.exit(1);
}

async function seed() {
    console.log("🔌  Connecting to MongoDB…");
    await mongoose.connect(MONGODB_URI!);
    console.log("✅  Connected.\n");

    // ── Safety Check: Does a Super Admin already exist? ──────────────────────
    const existingAdmin = await User.findOne({ user_type: "SUPER_ADMIN" });

    if (existingAdmin) {
        console.log(`ℹ️   A Super Admin already exists in the database → ${existingAdmin.email}`);
        console.log("\nNothing to do. Exiting.\n");
    } else {
        console.log("⏳  Hashing password…");
        const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);

        console.log("⏳  Creating Super Admin record…");
        const admin = await User.create({
            name: SUPER_ADMIN_NAME,
            email: SUPER_ADMIN_EMAIL,
            passwordHash,
            user_type: "SUPER_ADMIN",
            is_active: true,
            // Notice: organization_id is left undefined/null because they sit above all orgs
        });

        console.log(`\n🎉  Super Admin user seeded successfully!`);
        console.log(`    Name   : ${admin.name}`);
        console.log(`    Email  : ${admin.email}`);
        console.log(`    Type   : SUPER_ADMIN`);
        console.log(`    ID     : ${admin._id}\n`);
    }

    await mongoose.disconnect();
    console.log("🔌  Disconnected. Done.");
}

seed().catch((err) => {
    console.error("❌  Seed failed:", err);
    mongoose.disconnect();
    process.exit(1);
});