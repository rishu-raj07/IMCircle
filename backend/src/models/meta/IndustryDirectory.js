import mongoose from "mongoose";

const industryDirectorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    category: { type: String, default: "" },
    searchText: { type: String, index: true },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

industryDirectorySchema.pre("save", function () {
  this.searchText = `${this.name} ${this.category}`.toLowerCase().trim();
});

export default mongoose.model("IndustryDirectory", industryDirectorySchema);