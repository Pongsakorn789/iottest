import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const filters = [
  { id: "all", label: "All", icon: "layers-outline" },
  { id: "Critical", label: "Critical", icon: "warning-outline" },
  { id: "Warning", label: "Warning", icon: "alert-outline" },
  { id: "Info", label: "Info", icon: "information-circle-outline" },
];

const notificationsData = [
  {
    id: "1",
    title: "WiFi Connection Lost",
    message: 'Unable to connect to "IBS-TH3"',
    location: "Factory 1 hibiscus flower plot",
    type: "Critical",
    time: "2 hours ago",
    isRead: false,
    date: "Today",
  },
  {
    id: "2",
    title: "Battery Low",
    message: '20% battery remaining "IBS-TH3"',
    location: "Factory 1 hibiscus flower plot",
    type: "Warning",
    time: "3 hours ago",
    isRead: false,
    date: "Today",
  },
  {
    id: "3",
    title: "Backup Completed",
    message: 'Your files have been successfully backed up "IBS-TH3"',
    location: "Factory 1 hibiscus flower plot",
    type: "Info",
    time: "12 jan 2024",
    isRead: true,
    date: "Yesterday",
  },
  {
    id: "4",
    title: 'Data Error "IBS-TH3"',
    message: "There is a problem with the data",
    location: "Factory 1 hibiscus flower plot",
    type: "Info",
    time: "12 jan 2024",
    isRead: true,
    date: "Yesterday",
  },
  {
    id: "5",
    title: "WiFi Connection Lost",
    message: 'Unable to connect to "IBS-TH3"',
    location: "Factory 1 hibiscus flower plot",
    type: "Critical",
    time: "12 jan 2024",
    isRead: true,
    date: "Yesterday",
  },
];

export default function NotificationScreen() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState("all");

  const filteredNotifications =
    selectedFilter === "all"
      ? notificationsData
      : notificationsData.filter((item) => item.type === selectedFilter);

  const getBackgroundColor = (type, isRead) => {
    if (isRead) return "#FFFFFF";
    switch (type) {
      case "Critical":
        return "#FDEDED";
      case "Warning":
        return "#FFF8E1";
      case "Info":
        return "#E3F2FD";
      default:
        return "#FFFFFF";
    }
  };

  const getIcon = (title, type) => {
    if (type === "Info") {
      if (title.includes("Backup Completed")) {
        return (
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={24} color="green" />
          </View>
        );
      } else if (title.includes("Data Error")) {
        return (
          <View style={styles.infoIconContainer}>
            <Ionicons name="alert-circle" size={24} color="blue" />
          </View>
        );
      }
    }
  
    switch (type) {
      case "Critical":
        return <Ionicons name="wifi" size={24} color="red" />;
      case "Warning":
        return <Ionicons name="battery-half" size={24} color="orange" />;
      default:
        return null;
    }
  };
  
  const renderNotificationItem = ({ item }) => (
    <View
      style={[
        styles.notificationContainer,
        { backgroundColor: getBackgroundColor(item.type, item.isRead) },
      ]}
    >
      <View style={styles.notificationIcon}>{getIcon(item.title, item.type)}</View>
      <View style={styles.notificationText}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <View style={styles.notificationFooter}>
          <Ionicons name="location-outline" size={16} color="gray" />
          <Text style={styles.notificationLocation}>{item.location}</Text>
          <Text style={styles.notificationTime}>{item.time}</Text>
        </View>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </View>
  );
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreOptions}>
          <MaterialIcons name="more-vert" size={24} color="black" />
        </TouchableOpacity>
      </View>

      {/* Title (อยู่ใต้ลูกศรย้อนกลับ) */}
      <Text style={styles.headerTitle}>Notification</Text>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              selectedFilter === filter.id && styles.selectedFilter,
            ]}
            onPress={() => setSelectedFilter(filter.id)}
          >
            <Ionicons
              name={filter.icon}
              size={16}
              color={selectedFilter === filter.id ? "white" : "black"}
            />
            <Text
              style={[
                styles.filterText,
                selectedFilter === filter.id && { color: "white" },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: "#F9F9F9", 
      padding: 23,
      paddingTop: 50,
    },
  
    header: { 
      flexDirection: "row", 
      alignItems: "center", 
      justifyContent: "space-between", 
      marginBottom: 5, 
      marginLeft: 10,
    },
  
    backButton: {
      padding: 10,
    },
  
    moreOptions: {
      padding: 10,
    },
  
    headerTitle: { 
      fontSize: 20, 
      fontWeight: "bold",
      textAlign: "left",
      marginLeft: 5,
      marginTop: 5,
    },
  
    filterContainer: {
      flexDirection: "row",
      marginBottom: 20,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: "#DADADA",
      marginTop: 30,
    },
  
    filterButton: { 
      flexDirection: "row", 
      alignItems: "center", 
      padding: 10,
      marginRight: 10, 
      borderRadius: 20, 
      backgroundColor: "#E0E0E0",
    },
  
    selectedFilter: { backgroundColor: "#007BFF" },
    filterText: { marginLeft: 4, fontSize: 14 },
    notificationContainer: { flexDirection: "row", padding: 12, borderRadius: 8, marginBottom: 10, alignItems: "center" },
    notificationIcon: { marginRight: 10 },

    successIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#E0FFE0",
      justifyContent: "center",
      alignItems: "center",
    },
    infoIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#E3F2FD",
      justifyContent: "center",
      alignItems: "center",
    },
    notificationText: { flex: 1 },
    notificationTitle: { fontWeight: "bold", fontSize: 16 },
    notificationMessage: { fontSize: 14, color: "gray" },
    notificationFooter: { flexDirection: "row", alignItems: "center", marginTop: 4 },
    notificationLocation: { marginLeft: 4, fontSize: 12, color: "gray" },
    notificationTime: { marginLeft: "auto", fontSize: 12, color: "gray" },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#007BFF" },
  });