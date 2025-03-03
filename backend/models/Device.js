const mongoose = require("mongoose");

const DeviceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }, 
  name: { type: String, required: true },
  type: { type: String, required: true },
  image: { type: String, required: true },
  status: { type: String, default: "Connected" },
  createdAt: { type: Date, default: Date.now },
  deviceId: { type: String, required: true, index: true } 
});

module.exports = mongoose.model("Device", DeviceSchema);
