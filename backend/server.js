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

const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/auth-demo";
const SECRET_KEY = process.env.SECRET_KEY || "your_secret_key";
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

const generateMockSensorData = (date) => {
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
    co2 = parseInt(Math.random() * (1000 - 200) + 200, 10);
    ec = parseFloat((Math.random() * (2.0 - 0.5) + 0.5).toFixed(2));
    ph = parseFloat((Math.random() * (9 - 4) + 4).toFixed(2));
  }

  let dewPoint = null, vpo = null;
  if (temperature !== null && humidity !== null) {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temperature) / (b + temperature)) + Math.log(humidity / 100);
    dewPoint = (b * alpha) / (a - alpha);
    dewPoint = parseFloat(dewPoint.toFixed(2));

    const saturationVaporPressure = 0.6108 * Math.exp((17.27 * temperature) / (temperature + 237.3));
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
    timestamp: date.toISOString(),
  };
};

const createTestUser = async () => {
  const testEmail = "test@example.com";
  let user = await User.findOne({ email: testEmail });
  if (!user) {
    user = new User({
      email: testEmail,
      password: await bcrypt.hash("password123", 10),
    });
    await user.save();
    console.log("✅ Created test user:", testEmail);
  }
  return user._id;
};

const simulateInitialSensorData = async () => {
  const userId = await createTestUser();

  const device = await Device.findOne({ deviceId: 'AM2315' });
  if (!device) {
    const newDevice = new Device({
      userId: userId,
      name: 'Sensor IBS-TH3',
      type: 'sensor',
      image: 'https://example.com/sensor-image.png',
      status: 'Connected',
      deviceId: 'AM2315',
      data: [],
    });
    await newDevice.save();
    console.log("✅ Created new device: AM2315");
  }

  const now = new Date();
  const daysBack = 60;
  const intervalHours = 4;
  const totalRecords = daysBack * (24 / intervalHours);

  for (let i = 0; i < totalRecords; i++) {
    const pastDate = new Date(now.getTime() - i * intervalHours * 60 * 60 * 1000);
    const sensorData = generateMockSensorData(pastDate);
    try {
      const existingDevice = await Device.findOne({ deviceId: 'AM2315' });
      existingDevice.data.push(sensorData);
      await existingDevice.save();
      console.log(`Added historical data for ${pastDate}`);
    } catch (err) {
      console.error("Error saving initial sensor data:", err);
    }
  }

  for (let i = 0; i < 5; i++) {
    const recentDate = new Date(now.getTime() - i * 60 * 60 * 1000);
    const sensorData = {
      sensorId: 'AM2315',
      temperature: parseFloat((Math.random() * (40 - 20) + 20).toFixed(2)),
      humidity: parseFloat((Math.random() * (80 - 30) + 30).toFixed(2)),
      co2: parseInt(Math.random() * (1000 - 200) + 200, 10),
      ec: parseFloat((Math.random() * (2.0 - 0.5) + 0.5).toFixed(2)),
      ph: parseFloat((Math.random() * (9 - 4) + 4).toFixed(2)),
      timestamp: recentDate.toISOString(),
    };

    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * sensorData.temperature) / (b + sensorData.temperature)) + Math.log(sensorData.humidity / 100);
    sensorData.dew_point = parseFloat(((b * alpha) / (a - alpha)).toFixed(2));
    const saturationVaporPressure = 0.6108 * Math.exp((17.27 * sensorData.temperature) / (sensorData.temperature + 237.3));
    const actualVaporPressure = saturationVaporPressure * (sensorData.humidity / 100);
    sensorData.vpo = parseFloat((saturationVaporPressure - actualVaporPressure).toFixed(2));

    try {
      const existingDevice = await Device.findOne({ deviceId: 'AM2315' });
      existingDevice.data.push(sensorData);
      await existingDevice.save();
      console.log(`Added recent data for ${recentDate}`);
    } catch (err) {
      console.error("Error saving recent sensor data:", err);
    }
  }
};

const simulateSensorData = async () => {
  const sensorData = {
    sensorId: 'AM2315',
    temperature: parseFloat((Math.random() * (40 - 20) + 20).toFixed(2)),
    humidity: parseFloat((Math.random() * (80 - 30) + 30).toFixed(2)),
    co2: parseInt(Math.random() * (1000 - 200) + 200, 10),
    ec: parseFloat((Math.random() * (2.0 - 0.5) + 0.5).toFixed(2)),
    ph: parseFloat((Math.random() * (9 - 4) + 4).toFixed(2)),
    timestamp: new Date().toISOString(),
  };

  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * sensorData.temperature) / (b + sensorData.temperature)) + Math.log(sensorData.humidity / 100);
  sensorData.dew_point = parseFloat(((b * alpha) / (a - alpha)).toFixed(2));
  const saturationVaporPressure = 0.6108 * Math.exp((17.27 * sensorData.temperature) / (sensorData.temperature + 237.3));
  const actualVaporPressure = saturationVaporPressure * (sensorData.humidity / 100);
  sensorData.vpo = parseFloat((saturationVaporPressure - actualVaporPressure).toFixed(2));

  console.log("Simulated Sensor Data:", sensorData);

  try {
    const device = await Device.findOne({ deviceId: 'AM2315' });
    if (device) {
      device.data.push(sensorData);
      await device.save();
      console.log("Sensor data saved to database:", sensorData);
    } else {
      console.log("Device not found for deviceId:", sensorData.sensorId);
    }
  } catch (err) {
    console.error("Error saving sensor data:", err);
  }
};

simulateInitialSensorData().then(() => {
  simulateSensorData();
  setInterval(simulateSensorData, 3600000);
});

app.get('/', (req, res) => {
  res.send('Hello! Backend Server is running. 🚀');
});

app.use("/api/devices", require("./routes/deviceRoutes"));

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

app.post('/api/user/sensor-data', authenticateToken, async (req, res, next) => {
  const { error } = userDataValidationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const device = await Device.findOne({ deviceId: 'AM2315' });
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const newData = req.body.newData;

    const isDuplicate = device.data.some(
      (item) => item.sensorId === newData.sensorId && item.timestamp === newData.timestamp
    );

    if (isDuplicate) {
      return res.status(409).json({ message: 'Duplicate data entry detected' });
    }

    device.data.push(newData);
    await device.save();

    res.status(200).json({ message: 'Sensor data added successfully!', data: device.data });
  } catch (err) {
    next(err);
  }
});

app.get('/api/user/sensor-data', authenticateToken, async (req, res, next) => {
  try {
    const device = await Device.findOne({ deviceId: 'AM2315' });
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    let filteredData = device.data;
    const { startDate, endDate } = req.query;

    if (startDate && endDate) {
      filteredData = device.data.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= new Date(startDate) && itemDate <= new Date(endDate + "T23:59:59");
      });

      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      if (daysDiff <= 2) {
        console.log("Sending raw data for", daysDiff, "days:", filteredData);
        res.status(200).json({ data: filteredData });
      } else {
        // คำนวณค่าเฉลี่ยวันละ 1 รายการ
        const dailyData = {};
        filteredData.forEach(item => {
          const date = new Date(item.timestamp).toISOString().split("T")[0];
          if (!dailyData[date]) {
            dailyData[date] = {
              temperature: { sum: 0, count: 0 },
              humidity: { sum: 0, count: 0 },
              dew_point: { sum: 0, count: 0 },
              vpo: { sum: 0, count: 0 },
              timestamp: item.timestamp, // ใช้ timestamp ล่าสุดของวัน
            };
          }
          if (item.temperature !== null) {
            dailyData[date].temperature.sum += item.temperature;
            dailyData[date].temperature.count += 1;
          }
          if (item.humidity !== null) {
            dailyData[date].humidity.sum += item.humidity;
            dailyData[date].humidity.count += 1;
          }
          if (item.dew_point !== null) {
            dailyData[date].dew_point.sum += item.dew_point;
            dailyData[date].dew_point.count += 1;
          }
          if (item.vpo !== null) {
            dailyData[date].vpo.sum += item.vpo;
            dailyData[date].vpo.count += 1;
          }
          // อัปเดต timestamp ให้เป็นรายการล่าสุดของวัน
          if (new Date(item.timestamp) > new Date(dailyData[date].timestamp)) {
            dailyData[date].timestamp = item.timestamp;
          }
        });

        const averagedData = Object.keys(dailyData).map(date => ({
          sensorId: 'AM2315',
          temperature: dailyData[date].temperature.count > 0 
            ? parseFloat((dailyData[date].temperature.sum / dailyData[date].temperature.count).toFixed(2)) 
            : null,
          humidity: dailyData[date].humidity.count > 0 
            ? parseFloat((dailyData[date].humidity.sum / dailyData[date].humidity.count).toFixed(2)) 
            : null,
          dew_point: dailyData[date].dew_point.count > 0 
            ? parseFloat((dailyData[date].dew_point.sum / dailyData[date].dew_point.count).toFixed(2)) 
            : null,
          vpo: dailyData[date].vpo.count > 0 
            ? parseFloat((dailyData[date].vpo.sum / dailyData[date].vpo.count).toFixed(2)) 
            : null,
          timestamp: dailyData[date].timestamp,
        }));

        console.log("Sending averaged data for", daysDiff, "days:", averagedData);
        res.status(200).json({ data: averagedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) });
      }
    } else {
      console.log("Sending all data:", filteredData);
      res.status(200).json({ data: filteredData });
    }
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));