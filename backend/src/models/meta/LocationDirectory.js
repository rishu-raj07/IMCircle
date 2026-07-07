import mongoose from "mongoose";

const locationDirectorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    district: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "India" },
    type: { type: String, default: "City" },
    searchText: { type: String, index: true },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

locationDirectorySchema.pre("save", function () {
  this.searchText = `${this.name} ${this.district} ${this.state} ${this.country} ${this.type}`
    .toLowerCase()
    .trim();
});

export default mongoose.model("LocationDirectory", locationDirectorySchema);