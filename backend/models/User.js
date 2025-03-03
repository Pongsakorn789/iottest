const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    devices: [{ type: mongoose.Schema.Types.ObjectId, ref: "Device" }], // อ้างอิงถึงอุปกรณ์ที่ Connect
    data: {
      type: [
        {
          sensorId: {
            type: String,
            required: [true, "Sensor ID is required"],
            trim: true,
          },
          temperature: {
            type: Number,
            required: false,
          },
          humidity: {
            type: Number,
            required: false,
          },
          timestamp: {
            type: Date,
            required: [true, "Timestamp is required"],
          },
        },
      ],
      default: [],
      validate: {
        validator: function (data) {
          const uniqueEntries = new Set(
            data.map((item) => `${item.sensorId}-${item.timestamp.toISOString()}`)
          );
          return uniqueEntries.size === data.length;
        },
        message: "Duplicate sensor data detected in user data.",
      },
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model("User", userSchema);
