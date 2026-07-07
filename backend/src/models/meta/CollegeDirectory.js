import mongoose from "mongoose";

const collegeDirectorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    type: { type: String, default: "College" },
    website: { type: String, default: "" },
    searchText: { type: String, index: true },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

collegeDirectorySchema.pre("save", function () {
  this.searchText = `${this.name} ${this.city} ${this.state} ${this.type}`
    .toLowerCase()
    .trim();
});

export default mongoose.model("CollegeDirectory", collegeDirectorySchema);