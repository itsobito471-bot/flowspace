import mongoose from "mongoose";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI;

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role_id: mongoose.Schema.Types.ObjectId,
  organization_id: mongoose.Schema.Types.ObjectId,
});
const User = mongoose.models.User || mongoose.model("User", UserSchema);

const TaskSchema = new mongoose.Schema({
  title: String,
  organization_id: mongoose.Schema.Types.ObjectId,
  assignee_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});
const Task = mongoose.models.Task || mongoose.model("Task", TaskSchema);

async function run() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not found");
    return;
  }
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to DB");

  const users = await User.find({}).lean();
  console.log("=== USERS ===");
  users.forEach((u: any) => {
    console.log(`User ID: ${u._id}, Name: ${u.name}, Email: ${u.email}, Org ID: ${u.organization_id}`);
  });

  const tasks = await Task.find({}).lean();
  console.log("\n=== TASKS ===");
  tasks.forEach((t: any) => {
    console.log(`Task ID: ${t._id}, Title: ${t.title}, Org ID: ${t.organization_id}, Assignee IDs: ${JSON.stringify(t.assignee_ids)}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
