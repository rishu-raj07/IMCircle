import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model("User", userSchema, "users");

try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  const u = await User.findOne({ username: "rishuraj07" }).select("username avatar gender fullName").lean();
  console.log(JSON.stringify(u, null, 2));
} catch (err) {
  console.error("ERR:", err.message);
} finally {
  await mongoose.disconnect().catch(()=>{});
  process.exit(0);
}
