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

  const cookId = new mongoose.Types.ObjectId("69d3319685ba8af4a65a1558");
  const task = await Task.findOne({ title: "Sample Task One" });
  if (task) {
    if (!task.assignee_ids.includes(cookId)) {
      task.assignee_ids.push(cookId);
      await task.save();
      console.log("Assigned Sample Task One to Tim Cook!");
    } else {
      console.log("Sample Task One was already assigned to Tim Cook.");
    }
  } else {
    console.error("Sample Task One not found.");
  }

  await mongoose.disconnect();
}

run().catch(console.error);
