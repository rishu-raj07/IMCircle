import mongoose from "mongoose";

const degreeDirectorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    type: { type: String, default: "Degree" },
    searchText: { type: String, index: true },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

degreeDirectorySchema.pre("save", function () {
  this.searchText = `${this.name} ${this.type}`.toLowerCase().trim();
});

export default mongoose.model("DegreeDirectory", degreeDirectorySchema);