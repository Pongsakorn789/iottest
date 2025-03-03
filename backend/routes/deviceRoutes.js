const express = require("express");
const Device = require("../models/Device");
const User = require("../models/User"); // ✅ เพิ่ม Model User
const authenticateToken = require("../middleware/authMiddleware");
const router = express.Router();

// ✅ 1. บันทึกอุปกรณ์ที่เชื่อมต่อ (รองรับการอัปเดต และเพิ่มใน User)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, type, image, deviceId } = req.body;
    
    // หา User ที่ล็อกอินอยู่
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ตรวจสอบว่ามีอุปกรณ์นี้อยู่แล้วหรือไม่
    let device = await Device.findOne({ userId: req.user.id, deviceId });

    if (device) {
      // ✅ ถ้ามีอุปกรณ์แล้ว → อัปเดตข้อมูล
      device.status = "Connected";
      device.image = image;
      device.updatedAt = new Date();
      await device.save();
    } else {
      // ✅ ถ้ายังไม่มี → เพิ่มอุปกรณ์ใหม่
      device = new Device({ userId: req.user.id, name, type, image, deviceId });
      await device.save();
      
      // ✅ เพิ่มอุปกรณ์เข้าไปใน user.devices
      user.devices.push(device._id);
      await user.save();
    }

    return res.status(201).json({ message: "Device Connected", device });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ 2. ดึงอุปกรณ์ที่เชื่อมต่อของ User (ต้องมี Token)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const devices = await Device.find({ userId: req.user.id });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ 3. ลบอุปกรณ์ที่เชื่อมต่อ (ต้องมี Token)
router.delete("/:deviceId", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const deletedDevice = await Device.findOneAndDelete({
      _id: req.params.deviceId,
      userId: req.user.id, 
    });

    if (!deletedDevice) {
      return res.status(404).json({ message: "Device not found" });
    }

    // ✅ เอา Device ออกจาก user.devices
    user.devices = user.devices.filter((id) => id.toString() !== req.params.deviceId);
    await user.save();

    res.json({ message: "Device removed successfully", device: deletedDevice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;