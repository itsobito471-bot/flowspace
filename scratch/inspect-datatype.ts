import mongoose from "mongoose";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not found");
    return;
  }
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to DB");

  const db = mongoose.connection.db;
  if (!db) {
    console.error("No DB connection");
    return;
  }
  const tasks = await db.collection("tasks").find({}).toArray();
  for (const t of tasks) {
    console.log(`Task: ${t.title}`);
    console.log(`- organization_id type: ${t.organization_id?.constructor?.name} / value: ${t.organization_id}`);
    if (t.assignee_ids) {
      console.log(`- assignee_ids:`);
      for (const id of t.assignee_ids) {
        console.log(`  * element type: ${id?.constructor?.name} / value: ${id}`);
      }
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
