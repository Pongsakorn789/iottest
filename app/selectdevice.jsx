import React, { useState } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Modal, Alert, Platform 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = 'http://172.16.22.142:3000/api/devices';
// ที่อยู่ipของแต่ละเครื่อง (ipconfig) แล้วดูตรง IPv4 Address 
// ถ้าต่อผ่าน wifi ดูที่ Wireless LAN adapter Wi-Fi: IPv4 Address
// ถ้าต่อผ่าน LAN ดูที่ Ethernet adapter Ethernet: IPv4 Address
// http://<your-ip>:3000/api/devices

const devices = [
  { id: "1", name: "IBS-TH3", type: "Temperature & Humidity Sensor", image: require("./assets/sensor.png") },
  { id: "2", name: "IBS-TH4", type: "Temperature & Humidity Sensor", image: require("./assets/sensor2.png") },
  { id: "3", name: "IBS-TH5", type: "Temperature & Humidity Sensor", image: require("./assets/sensor3.png") },
  { id: "4", name: "IBS-TH6", type: "Temperature & Humidity Sensor", image: require("./assets/sensor4.png") },
];

export default function SelectDeviceScreen() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);

  const handleConnect = async (device) => {
    setConnected(true);

    try {
      const token = await AsyncStorage.getItem("token"); 
      if (!token) {
        Alert.alert("Error", "User is not logged in");
        return;
      }

      const response = await axios.post(
        API_URL,
        { name: device.name, type: device.type, image: device.image, deviceId: device.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("✅ Device Connected:", response.data);
    } catch (error) {
      console.error("❌ Error connecting device:", error);
      Alert.alert("Error", "Failed to connect device");
    }

    setTimeout(() => {
      setConnected(false);
      router.replace("/tabs/home"); 
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Device</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
          <Text style={[styles.tabText, styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Sensors</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Temperature</Text>
        </TouchableOpacity>
      </View>

      {/* Scanning Text */}
      <Text style={styles.scanningText}>🔍 Scanning for devices...</Text>

      {/* Device List */}
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }} // ป้องกันชนขอบล่าง
        renderItem={({ item }) => (
          <View style={styles.deviceItem}>
            <Image source={item.image} style={styles.deviceImage} />
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{item.name}</Text>
              <Text style={styles.deviceType}>{item.type}</Text>
            </View>
            <TouchableOpacity style={styles.connectButton} onPress={() => handleConnect(item)}>
              <Text style={styles.connectButtonText}>Connect</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Modal Connected */}
      <Modal visible={connected} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle" size={50} color="green" />
            <Text style={styles.connectedText}>Connected</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#FFF", 
    paddingHorizontal: 20,
    paddingTop: Platform.select({ ios: 20, android: 20 }), 
  },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: "bold", marginLeft: 10 },

  tabs: { flexDirection: "row", marginBottom: 10 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#EAEAEA",
    marginRight: 10,
  },
  activeTab: { backgroundColor: "#007AFF" },
  tabText: { fontSize: 14, color: "#333" },
  activeTabText: { color: "#FFF", fontWeight: "bold" },

  scanningText: { fontSize: 14, color: "#666", marginBottom: 10 },

  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12, 
  },
  deviceImage: { width: 50, height: 50, marginRight: 10 },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  deviceType: { fontSize: 12, color: "#666" },

  connectButton: { 
    backgroundColor: "#007AFF", 
    paddingVertical: 6,
    paddingHorizontal: 10, 
    borderRadius: 6,
    flexShrink: 1, 
  },
  connectButtonText: { color: "#FFF", fontWeight: "bold" },

  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#FFF", padding: 30, borderRadius: 10, alignItems: "center" },
  connectedText: { fontSize: 18, fontWeight: "bold", color: "green", marginTop: 10 },
});
