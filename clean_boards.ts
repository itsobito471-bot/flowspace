import mongoose from "mongoose";
import * as dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

mongoose.connect(MONGO_URI as string).then(async () => {
  console.log("Connected");
  const db = mongoose.connection.db;
  if (!db) {
    console.error("Database connection failed");
    process.exit(1);
  }

  // Find all boards named "General Board"
  const boards = await db.collection("boards").find({ name: "General Board" }).toArray();
  console.log(`Found ${boards.length} General Boards.`);

  if (boards.length > 1) {
    const [keep, ...remove] = boards;
    console.log(`Keeping board: ${keep._id}`);

    // Move any pages and tasks to the kept board just in case
    for (const b of remove) {
      await db.collection("pages").updateMany({ board_id: b._id }, { $set: { board_id: keep._id } });
      await db.collection("tasks").updateMany({ board_id: b._id }, { $set: { board_id: keep._id } });
      await db.collection("boards").deleteOne({ _id: b._id });
    }
    console.log(`Removed ${remove.length} duplicate General Boards.`);
  }

  process.exit();
});
