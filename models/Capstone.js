const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const capstoneSchema = new Schema(
  {
    title: String,
    description: String,
    logo: String,
    website: String,
    website_views: Number,
    documents: String,
    images: [String],
    ratings: [
      {
        rating: Number,
        count: Number,
        rate_by: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      },
    ],
    rate: Number,
    approver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    tags: { type: [mongoose.Schema.Types.ObjectId], ref: "Tag" },
    percentage: Number,
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: mongoose.Schema.Types.Date,
        comment: String,
      },
    ],
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { collection: "capstones" }
);

const Capstone = mongoose.model("Capstone", capstoneSchema);

module.exports = Capstone;
