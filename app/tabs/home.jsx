import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Alert,
  Switch,
} from "react-native";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

const API_URL = 'http://172.16.22.142:3000/api/devices';
// ที่อยู่ipของแต่ละเครื่อง (ipconfig) แล้วดูตรง IPv4 Address 
// ถ้าต่อผ่าน wifi ดูที่ Wireless LAN adapter Wi-Fi: IPv4 Address
// ถ้าต่อผ่าน LAN ดูที่ Ethernet adapter Ethernet: IPv4 Address
// http://<172.16.22.111>:3000/api/devices

const WEATHER_API_KEY = "137ea86a7cc8fd70e39b16ad03c010a4";
const CITY_NAME = "Chiang Rai";
const COUNTRY_CODE = "TH";

export default function HomeScreen() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const router = useRouter();
  const [devices, setDevices] = useState([]);
  const toggleDeviceStatus = (deviceId) => {
    setDevices((prevDevices) =>
      prevDevices.map((device) =>
        device._id === deviceId
          ? {
              ...device,
              status: device.status === "Online" ? "Offline" : "Online",
            }
          : device
      )
    );
  };

  useEffect(() => {
    fetchWeather();
    updateDate();
    fetchDevices();
  }, []);

  // ✅ ดึงข้อมูลอุปกรณ์ของ User จาก MongoDB
  const fetchDevices = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }

      const response = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("📡 Devices Data:", response.data);

      if (Array.isArray(response.data)) {
        setDevices(response.data);
      } else {
        setDevices([]);
      }
    } catch (error) {
      console.error("❌ Error fetching devices:", error);
      setDevices([]);
    }
  };

  // ✅ ฟังก์ชันลบอุปกรณ์
  const handleDeleteDevice = async (deviceId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "User is not logged in");
        return;
      }

      const response = await axios.delete(`${API_URL}/${deviceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200) {
        Alert.alert("Success", "Device removed successfully");
        setDevices(devices.filter((device) => device._id !== deviceId));
      }
    } catch (error) {
      console.error("❌ Error deleting device:", error);
      Alert.alert("Error", "Failed to remove device");
    }
  };

  const fetchWeather = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${CITY_NAME},${COUNTRY_CODE}&appid=${WEATHER_API_KEY}&units=metric`
      );
      setWeather(response.data);
    } catch (error) {
      console.error("Error fetching weather:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateDate = () => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const today = new Date().toLocaleDateString("en-US", options);
    setDate(today);
  };

  const getWeatherIcon = (condition) => {
    switch (condition) {
      case "Clear":
        return <Ionicons name="sunny" size={32} color="#FFA500" />;
      case "Rain":
        return <Ionicons name="rainy" size={32} color="#007AFF" />;
      case "Clouds":
        return <Ionicons name="cloud" size={32} color="#888888" />;
      case "Mist":
      case "Fog":
      case "Haze":
        return <Ionicons name="cloud-outline" size={32} color="#A9A9A9" />;
      case "Thunderstorm":
        return <Ionicons name="thunderstorm" size={32} color="#FF4500" />;
      case "Snow":
        return <Ionicons name="snow" size={32} color="#00BFFF" />;
      case "Tornado":
        return <Ionicons name="warning" size={32} color="#8B0000" />;
      default:
        return <Ionicons name="partly-sunny" size={32} color="#A9A9A9" />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
  <ScrollView contentContainerStyle={styles.scrollContainer}>
    {/* Header */}
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Home</Text>
      <TouchableOpacity onPress={() => router.push("/notification")}>
  <Ionicons name="notifications-outline" size={26} color="black" />
</TouchableOpacity>
    </View>

        {/* วันที่ */}
        <Text style={styles.dateText}>{date}</Text>

        {/* Weather Widget */}
        <View style={styles.weatherWidget}>
          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : weather ? (
            <>
              <View style={styles.weatherHeader}>
                <View style={styles.weatherRow}>
                  {getWeatherIcon(weather.weather[0].main)}
                  <Text style={styles.weatherCondition}>
                    {weather.weather[0].main}
                  </Text>
                </View>
                <View>
                  <Text style={styles.weatherDate}>{date}</Text>
                  <Text style={styles.weatherCity}>
                    <Ionicons name="location-outline" size={16} color="gray" />{" "}
                    {CITY_NAME}
                  </Text>
                </View>
              </View>

              <Text style={styles.temperature}>
                {Math.round(weather.main.temp)}°C
              </Text>

              <View style={styles.weatherDetails}>
                <Text style={styles.feelsLike}>
                  <Ionicons name="thermometer-outline" size={16} color="gray" />{" "}
                  Feels like {Math.round(weather.main.feels_like)}°C
                </Text>
                <Text style={styles.humidity}>
                  <Ionicons name="water-outline" size={16} color="#007AFF" />{" "}
                  {weather.main.humidity}%
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.errorText}>Failed to load weather data</Text>
          )}
        </View>

        {/* Your Device Section */}
        <View style={styles.deviceSection}>
          <Text style={styles.sectionTitle}>Your Device</Text>
          <MaterialIcons name="more-horiz" size={24} color="black" />
        </View>

        {/* ✅ แสดงอุปกรณ์ที่เชื่อมต่อ */}
        {devices.length === 0 ? (
          <View style={styles.noDevice}>
            <Image
              source={require("../assets/no-device.png")}
              style={styles.noDeviceImage}
            />
            <Text style={styles.noDeviceText}>No Device</Text>
          </View>
        ) : (
          <View style={styles.deviceGrid}>
          {devices.map((device) => (
            <TouchableOpacity
              key={device._id}
              style={styles.deviceCard}
              onPress={() => router.push("/device-monitor")}
              activeOpacity={0.7} // ✅ เอฟเฟกต์เวลากด
            >
              {/* ปุ่มลบอุปกรณ์ */}
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={() => handleDeleteDevice(device._id)}
              >
                <MaterialIcons name="close" size={20} color="white" />
              </TouchableOpacity>
        
              {/* รูปภาพอุปกรณ์ */}
              <Image source={{ uri: device.image }} style={styles.deviceImage} />
        
              {/* Toggle Switch */}
              <Switch
                value={device.status === "Online"}
                onValueChange={() => toggleDeviceStatus(device._id)}
                trackColor={{ false: "#ccc", true: "#9FD4FA" }}
                thumbColor={device.status === "Online" ? "#fff" : "#f4f3f4"}
                style={styles.toggleSwitch}
              />
        
              {/* สถานะ Online/Offline */}
              <View style={styles.deviceStatusContainer}>
                <View
                  style={[
                    styles.statusDot,
                    device.status === "Online" ? styles.online : styles.offline,
                  ]}
                />
                <Text
                  style={[
                    styles.deviceStatusText,
                    device.status === "Online" ? styles.onlineText : styles.offlineText,
                  ]}
                >
                  {device.status === "Online" ? "Online" : "Offline"}
                </Text>
              </View>
        
              {/* ชื่ออุปกรณ์ */}
              <Text style={styles.deviceName}>{device.name}</Text>
        
              {/* แสดงแบตเตอรี่ และสถานะการเชื่อมต่อ */}
              <View style={styles.deviceInfo}>
                <Ionicons name="battery-half" size={16} color="green" />
                <Text style={styles.batteryText}>50%</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        
        )}

        {/* Add Device Button */}
        <TouchableOpacity
          style={styles.addDeviceButton}
          onPress={() => router.push("/selectdevice")}
        >
          <Ionicons name="add" size={18} color="white" />
          <Text style={styles.addDeviceText}>Add device</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF", padding: 20 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 26, fontWeight: "bold", color: "#333" },

  dateText: { fontSize: 16, color: "#777", marginVertical: 10 },

  weatherWidget: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  weatherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  weatherRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  weatherCondition: { fontSize: 18, fontWeight: "bold", marginLeft: 8 },
  weatherDate: { fontSize: 14, color: "#666", textAlign: "right" },
  weatherCity: { fontSize: 14, color: "#444", textAlign: "right" },

  temperature: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#333",
    marginVertical: 10,
  },
  weatherDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  feelsLike: { fontSize: 14, color: "#666" },
  humidity: { fontSize: 14, color: "#007AFF" },

  deviceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },

  noDevice: { alignItems: "center", marginBottom: 20 },
  noDeviceImage: { width: 250, height: 250, marginBottom: 10 },
  noDeviceText: { fontSize: 16, color: "#777" },

  addDeviceButton: {
    flexDirection: "row",
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addDeviceText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
    marginLeft: 5,
  },
  deviceContainer: { marginBottom: 20 },
  deviceItem: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: "#F0F0F0",
    marginBottom: 12,
    borderRadius: 12,
  },
  deviceImage: { width: 50, height: 50, marginRight: 10 },
  deviceName: { fontSize: 18, fontWeight: "bold" },
  deviceStatus: { fontSize: 13, color: "green" },
  deleteButton: {
    backgroundColor: "transparent",
    padding: 8,
    borderRadius: 6,
    marginLeft: 10,
  },

  disconnectText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },

  deviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  deviceCard: {
    width: "48%",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 15,
    alignItems: "center",
    position: "relative",
  },
  deviceImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginBottom: 8,
  },
  toggleSwitch: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  deviceStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  online: {
    backgroundColor: "green",
  },
  offline: {
    backgroundColor: "gray",
  },
  onlineText: {
    color: "green",
    fontSize: 14,
    fontWeight: "bold",
  },
  offlineText: {
    color: "gray",
    fontSize: 14,
    fontWeight: "bold",
  },

  deviceStatusText: {
    fontSize: 14,
    color: "green",
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
  },
  deviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  batteryText: {
    marginLeft: 5,
    fontSize: 14,
    color: "green",
  },

  disconnectButton: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#FF3B30",
    padding: 6,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
