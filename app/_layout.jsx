import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* หน้า Home (index) */}
      <Stack.Screen name="index" />

      {/* หน้า Device Monitor */}
      <Stack.Screen name="device-monitor" />

      {/* หน้า Sensor Detail */}
      <Stack.Screen name="sensor-detail" />

      {/* หน้า Full Chart */}
      <Stack.Screen name="full-chart" />

      {/* หน้า Error History */}
      <Stack.Screen name="error-history" />
    </Stack>
  );
}