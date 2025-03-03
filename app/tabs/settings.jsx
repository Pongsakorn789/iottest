import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";

const Setting = () => {
  const router = useRouter();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [language, setLanguage] = useState("EN");
  const PROFILE_IMAGE = require("../assets/profile.png");


  // ✅ ฟังก์ชันออกจากระบบ
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Yes",
        onPress: async () => {
          await AsyncStorage.removeItem("token");
          router.replace("/auth/sign-in"); 
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Setting</Text>
        </View>

        {/* User Info */}
        <View style={styles.profileSection}>
           <Image source={PROFILE_IMAGE} style={styles.profileImage} />
          <View>
            <Text style={styles.profileName}>Mew</Text>
            <Text style={styles.profileEmail}>mewza@gmail.com</Text>
          </View>
        </View>

        {/* Account & Security */}
        <Text style={styles.sectionTitle}>Account & Security</Text>
        <TouchableOpacity style={styles.menuItem}>
          <FontAwesome5 name="user-edit" size={18} color="#3b82f6" />
          <Text style={styles.menuText}>Account Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <FontAwesome5 name="shield-alt" size={18} color="#16a34a" />
          <Text style={styles.menuText}>Privacy & Security</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <FontAwesome5 name="lock" size={18} color="#1e40af" />
          <Text style={styles.menuText}>Password</Text>
        </TouchableOpacity>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={22} color="#ef4444" />
          <Text style={styles.menuText}>Notifications</Text>
          <Switch
            value={isNotificationsEnabled}
            onValueChange={setIsNotificationsEnabled}
            trackColor={{ false: "#ddd", true: "#4CAF50" }}
            thumbColor={"#fff"}
            style={{ marginLeft: "auto" }}
          />
        </View>
        <View style={styles.menuItem}>
          <Ionicons name="globe-outline" size={22} color="#2563eb" />
          <Text style={styles.menuText}>Language</Text>
          <View style={styles.languageSelector}>
            <TouchableOpacity
              style={[styles.languageButton, language === "TH" && styles.activeLanguage]}
              onPress={() => setLanguage("TH")}
            >
              <Text style={styles.languageText}>TH</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageButton, language === "EN" && styles.activeLanguage]}
              onPress={() => setLanguage("EN")}
            >
              <Text style={styles.languageText}>EN</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support & About */}
        <Text style={styles.sectionTitle}>Support & About</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={22} color="#1d4ed8" />
          <Text style={styles.menuText}>Help Center</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="document-text-outline" size={22} color="#374151" />
          <Text style={styles.menuText}>Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="shield-checkmark-outline" size={22} color="#16a34a" />
          <Text style={styles.menuText}>Privacy Policy</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Version 1.0.0(Beta)</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#1e293b",
    marginLeft: 12,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
  },
  profileEmail: {
    fontSize: 14,
    color: "#64748b",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#6b7280",
    marginBottom: 10,
    marginTop: 15,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
  },
  menuText: {
    fontSize: 16,
    color: "#1e293b",
    marginLeft: 10,
  },
  languageSelector: {
    flexDirection: "row",
    marginLeft: "auto",
  },
  languageButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#ddd",
    marginLeft: 5,
  },
  activeLanguage: {
    backgroundColor: "#2563eb",
  },
  languageText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  logoutButton: {
    marginTop: 20,
    paddingVertical: 14,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    alignItems: "center",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  versionText: {
    textAlign: "center",
    color: "#64748b",
    marginTop: 10,
  },
});

export default Setting;
