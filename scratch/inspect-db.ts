import mongoose from "mongoose";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI;

// Mock schemas
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

  const userIdString = "69dc72bc486b7902c6e91cf0"; // Katherine Adams
  
  // Try querying with string
  const tasksWithString = await Task.find({
    assignee_ids: userIdString
  });
  console.log(`Query with string returned: ${tasksWithString.length} tasks`);
  tasksWithString.forEach(t => console.log(`- ${t.title}`));

  // Try querying with ObjectId
  const tasksWithObjectId = await Task.find({
    assignee_ids: new mongoose.Types.ObjectId(userIdString)
  });
  console.log(`Query with ObjectId returned: ${tasksWithObjectId.length} tasks`);

  await mongoose.disconnect();
}

run().catch(console.error);
