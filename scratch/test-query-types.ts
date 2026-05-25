import mongoose from "mongoose";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI;

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

  const userId = "69dc72bc486b7902c6e91cf0"; // Katherine Adams
  const orgId = "69d3319685ba8af4a65a1553"; // Apple Org

  const query1 = {
    assignee_ids: userId,
    organization_id: orgId,
  };
  const tasks1 = await Task.find(query1);
  console.log(`Query 1 (string values) returned ${tasks1.length} tasks`);

  const query2 = {
    assignee_ids: new mongoose.Types.ObjectId(userId),
    organization_id: new mongoose.Types.ObjectId(orgId),
  };
  const tasks2 = await Task.find(query2);
  console.log(`Query 2 (ObjectId values) returned ${tasks2.length} tasks`);

  await mongoose.disconnect();
}

run().catch(console.error);
