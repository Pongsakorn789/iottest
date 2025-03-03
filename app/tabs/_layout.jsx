import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function CustomTabBarIcon({ focused, iconName, label }) {
  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperFocused]}>
      <Ionicons name={iconName} size={28} color={focused ? "#2C3E50" : "#7F8C8D"} />
      {focused && <Text style={styles.iconLabel}>{label}</Text>}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["left", "right"]}>
      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          headerShown: false,
          tabBarSafeAreaInset: 'never',
          tabBarStyle: { 
            backgroundColor: "#fff",
            height: 70, 
            paddingBottom: 40, 
            width: "100%",
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            borderTopWidth: 1,
            borderTopColor: "#E0E0E0",
            elevation: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            flexDirection: "row",
            justifyContent: "space-evenly",
            alignItems: "center", 
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ focused }) => (
              <CustomTabBarIcon focused={focused} iconName="home" label="Home" />
            ),
          }}
        />
        <Tabs.Screen
          name="statistics"
          options={{
            tabBarIcon: ({ focused }) => (
              <CustomTabBarIcon focused={focused} iconName="pie-chart-outline" label="Statistics" />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ focused }) => (
              <CustomTabBarIcon focused={focused} iconName="settings-outline" label="Settings" />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
} 

const styles = StyleSheet.create({
  iconWrapper: {
    minWidth: 116,
    height: 43,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  iconWrapperFocused: {
    backgroundColor: "#C2EAFF",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  iconLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#2C3E50",
  },
});
