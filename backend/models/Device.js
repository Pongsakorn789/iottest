const mongoose = require("mongoose");

const sensorDataSchema = new mongoose.Schema({
  sensorId: { type: String }, // Optional: เก็บ sensorId เฉพาะใน data
  temperature: { type: Number, default: null },
  humidity: { type: Number, default: null },
  co2: { type: Number, default: null },
  ec: { type: Number, default: null },
  ph: { type: Number, default: null },
  dew_point: { type: Number, default: null },
  vpo: { type: Number, default: null },
  timestamp: { type: String, required: true },
});

const DeviceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }, 
  name: { type: String, required: true },
  type: { type: String, required: true },
  image: { type: String, required: true },
  status: { type: String, default: "Connected" },
  createdAt: { type: Date, default: Date.now },
  deviceId: { type: String, required: true, index: true },
  data: [sensorDataSchema], // เพิ่มฟิลด์ data เพื่อเก็บข้อมูลเซ็นเซอร์
});

module.exports = mongoose.model("Device", DeviceSchema);