const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const authenticateToken = require("./middleware/authMiddleware");
const errorHandler = require("./middleware/errorHandler");
const { userValidationSchema, userDataValidationSchema } = require("./validation/userValidation");
const User = require("./models/User");
const Device = require("./models/Device");

const app = express();

// Environment variables
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/auth-demo";
const SECRET_KEY = process.env.SECRET_KEY || "your_secret_key";
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Simulate Sensor Data
const generateMockSensorData = () => {
  const shouldBeNull = Math.random() < 0.1;

  const temperature = shouldBeNull ? null : parseFloat((Math.random() * (40 - 20) + 20).toFixed(2));
  let humidity, co2, ec, ph;

  if (shouldBeNull) {
    humidity = null;
    co2 = null;
    ec = null;
    ph = null;
  } else {
    humidity = parseFloat((Math.random() * (80 - 30) + 30).toFixed(2));
    co2 = parseInt(Math.random() * (1000 - 200) + 200, 10); // CO2 200-1000 ppm
    ec = parseFloat((Math.random() * (2.0 - 0.5) + 0.5).toFixed(2)); // EC 0.5-2.0 mS/cm
    ph = parseFloat((Math.random() * (9 - 4) + 4).toFixed(2)); // pH 4-9
  }

  // คำนวณ Dew Point และ VPO (ตามโค้ดก่อนหน้า)
  let dewPoint = null, vpo = null;
  if (temperature !== null && humidity !== null) {
    const a = 17.27;
    const b = 237.7; // หน่วย °C
    const alpha = ((a * temperature) / (b + temperature)) + Math.log(humidity / 100);
    dewPoint = (b * alpha) / (a - alpha); // หน่วย °C
    dewPoint = parseFloat(dewPoint.toFixed(2));

    const saturationVaporPressure = 0.6108 * Math.exp((17.27 * temperature) / (temperature + 237.3)); // kPa
    const actualVaporPressure = saturationVaporPressure * (humidity / 100);
    vpo = parseFloat((saturationVaporPressure - actualVaporPressure).toFixed(2));
  }

  return {
    sensorId: 'AM2315',
    temperature,
    humidity,
    co2,
    ec,
    ph,
    dew_point: dewPoint,
    vpo: vpo,
    timestamp: new Date().toISOString(),
  };
};

// Simulate Sensor Data and Save to Database
const simulateSensorData = async () => {
  const sensorData = generateMockSensorData();
  console.log("Simulated Sensor Data:", sensorData);

  try {
    const device = await Device.findOne({ sensorId: sensorData.sensorId });
    if (device) {
      device.data.push(sensorData);
      await device.save();
      console.log("Sensor data saved to database:", sensorData);
    } else {
      console.log("Device not found for sensorId:", sensorData.sensorId);
    }
  } catch (err) {
    console.error("Error saving sensor data:", err);
  }
};

// Run the simulation immediately when the server starts
simulateSensorData();

// Run the simulation every 1 hour
setInterval(simulateSensorData, 600000);

// Routes
app.get('/', (req, res) => {
  res.send('Hello! Backend Server is running. 🚀');
});

// ✅ เชื่อม API อุปกรณ์เข้า Server
app.use("/api/devices", require("./routes/deviceRoutes"));

// ✅ Sign Up
app.post("/api/signup", async (req, res, next) => {
  const { error } = userValidationSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(409).json({ message: "Email already exists" });
    const newUser = new User({ email, password });

    await newUser.save();
    res.status(201).json({ message: "User created successfully!" });
  } catch (err) {
    next(err);
  }
});

// ✅ Sign In
app.post("/api/signin", async (req, res, next) => {
  const { error } = userValidationSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, { expiresIn: "1h" });

    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    next(err);
  }
});

// Add Sensor Data
app.post('/api/user/sensor-data', authenticateToken, async (req, res, next) => {
  const { error } = userDataValidationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newData = req.body.newData;

    const isDuplicate = user.data.some(
      (item) => item.sensorId === newData.sensorId && item.timestamp === newData.timestamp
    );

    if (isDuplicate) {
      return res.status(409).json({ message: 'Duplicate data entry detected' });
    }

    user.data.push(newData);
    await user.save();

    res.status(200).json({ message: 'Sensor data added successfully!', data: user.data });
  } catch (err) {
    next(err);
  }
});

// Get Sensor Data
app.get('/api/user/sensor-data', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ data: user.data });
  } catch (err) {
    next(err);
  }
});

// Global Error Handling Middleware
app.use(errorHandler);

// Start the server
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));