/**
 * seed-admin.ts
 *
 * Creates (or updates) the initial ADMIN Role and User in MongoDB.
 * Reads credentials from the .env file so nothing sensitive is hard-coded.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 * Idempotent – safe to run multiple times. Existing admin email won't be
 * duplicated; only missing fields are created.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// ── Load .env from project root ──────────────────────────────────────────────
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ── Inline lightweight schemas (avoids Next.js module graph issues) ──────────
const RoleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    department: { type: String, required: true },
    level: { type: String, enum: ["ADMIN", "EMPLOYEE"], required: true },
  },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
    leave_quota: { type: Number, default: 20 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Role = mongoose.models.Role || mongoose.model("Role", RoleSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);

// ── Read credentials from env ─────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI?.trim();
const ADMIN_NAME = (process.env.ADMIN_NAME ?? "Super Admin").trim();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD ?? "").trim();

if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set in .env");
  process.exit(1);
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("❌  ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  process.exit(1);
}

async function seed() {
  console.log("🔌  Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI!);
  console.log("✅  Connected.\n");

  // ── 1. Upsert the ADMIN Role ─────────────────────────────────────────────
  let adminRole = await Role.findOne({ level: "ADMIN" });

  if (!adminRole) {
    adminRole = await Role.create({
      title: "System Administrator",
      department: "Management",
      level: "ADMIN",
    });
    console.log(`✅  Admin Role created  →  ${adminRole._id}`);
  } else {
    console.log(`ℹ️   Admin Role already exists  →  ${adminRole._id}`);
  }

  // ── 2. Upsert the Admin User ─────────────────────────────────────────────
  const existing = await User.findOne({ email: ADMIN_EMAIL });

  if (existing) {
    console.log(`ℹ️   Admin user already exists  →  ${existing.email}`);
    console.log("\nNothing to do. Exiting.\n");
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const admin = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role_id: adminRole._id,
      leave_quota: 999,
      is_active: true,
    });

    console.log(`\n🎉  Admin user seeded successfully!`);
    console.log(`    Name   : ${admin.name}`);
    console.log(`    Email  : ${admin.email}`);
    console.log(`    Role   : System Administrator (ADMIN)`);
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
