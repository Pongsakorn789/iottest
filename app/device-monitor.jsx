import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, Platform, StatusBar } from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Battery from 'expo-battery';
import { BarChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://172.16.22.142:3000/api/user/sensor-data';
const screenWidth = Dimensions.get('window').width;
const isIOS = Platform.OS === 'ios';

const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('No authentication token found. Please log in.');
    return token;
  } catch (error) {
    console.error('Error retrieving token:', error);
    const navigation = useNavigation();
    navigation.replace('/signin');
    throw error;
  }
};

export default function DeviceMonitor() {
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [showTempChart, setShowTempChart] = useState(false);
  const [showHumidityChart, setShowHumidityChart] = useState(false);
  const [showDewPointChart, setShowDewPointChart] = useState(false);
  const [showVpoChart, setShowVpoChart] = useState(false);
  const [sensorData, setSensorData] = useState(null);
  const [latestData, setLatestData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const getBatteryLevel = async () => {
      const level = await Battery.getBatteryLevelAsync();
      setBatteryLevel(Math.round(level * 100));
    };
    getBatteryLevel();

    const fetchSensorData = async () => {
      try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.status === 401) {
          await AsyncStorage.removeItem('token');
          navigation.replace('/signin');
          throw new Error('Session expired. Please log in again.');
        }

        const data = await response.json();
        if (!data.data || data.data.length === 0) {
          setErrorMessage("ไม่มีข้อมูลเซ็นเซอร์ในฐานข้อมูล");
          setSensorData({
            temperature: { labels: [], values: [] },
            humidity: { labels: [], values: [] },
            dewPoint: { labels: [], values: [] },
            vpo: { labels: [], values: [] },
          });
          setLatestData(null);
          return;
        }

        // ดึงข้อมูลล่าสุด 5 รายการ โดยไม่จำกัด 5 ชั่วโมงถ้าไม่มีข้อมูลเพียงพอ
        let validData = data.data
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 5);

        if (validData.length > 0) {
          const latestEntry = validData[0];
          console.log("Latest Data:", latestEntry);
          setLatestData({
            temperature: latestEntry.temperature,
            humidity: latestEntry.humidity,
            dewPoint: latestEntry.dew_point,
            vpo: latestEntry.vpo,
            updatedAt: latestEntry.timestamp,
          });

          setSensorData({
            temperature: {
              labels: validData.map(entry => `${new Date(entry.timestamp).getHours()}.00`),
              values: validData.map(entry => entry.temperature || 0),
            },
            humidity: {
              labels: validData.map(entry => `${new Date(entry.timestamp).getHours()}.00`),
              values: validData.map(entry => entry.humidity || 0),
            },
            dewPoint: {
              labels: validData.map(entry => `${new Date(entry.timestamp).getHours()}.00`),
              values: validData.map(entry => entry.dew_point || 0),
            },
            vpo: {
              labels: validData.map(entry => `${new Date(entry.timestamp).getHours()}.00`),
              values: validData.map(entry => entry.vpo || 0),
            },
          });
          setErrorMessage(null);
        } else {
          setSensorData({
            temperature: { labels: [], values: [] },
            humidity: { labels: [], values: [] },
            dewPoint: { labels: [], values: [] },
            vpo: { labels: [], values: [] },
          });
          setLatestData(null);
          setErrorMessage("ไม่มีข้อมูลเซ็นเซอร์ที่ใช้งานได้");
        }
      } catch (error) {
        console.error("Error fetching sensor data:", error);
        setErrorMessage(error.message || "ไม่สามารถดึงข้อมูลเซ็นเซอร์ได้");
        setSensorData({
          temperature: { labels: [], values: [] },
          humidity: { labels: [], values: [] },
          dewPoint: { labels: [], values: [] },
          vpo: { labels: [], values: [] },
        });
        setLatestData(null);
      }
    };

    fetchSensorData();
    const interval = setInterval(fetchSensorData, 3600000); // อัปเดตทุกชั่วโมง
    return () => clearInterval(interval);
  }, []);

  const renderChart = (data, color, type) => {
    if (!data || !data.labels.length) {
      return <Text style={styles.noDataText}>ไม่มีข้อมูล</Text>;
    }

    const chartConfig = {
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#f0f4f8',
      decimalPlaces: 2,
      color: () => color,
      labelColor: () => '#333',
      strokeWidth: 2,
      barPercentage: 0.6,
      propsForBars: { rx: 4, ry: 4 },
      fillShadowGradient: color,
      fillShadowGradientOpacity: 0.6,
    };

    return (
      <TouchableOpacity onPress={() => navigation.navigate('full-chart', { data: JSON.stringify(data), color, type })}>
        <View style={styles.chartContainer}>
          <BarChart
            data={{ labels: data.labels, datasets: [{ data: data.values }] }}
            width={screenWidth - 40}
            height={220}
            yAxisLabel=""
            chartConfig={chartConfig}
            style={styles.chartStyle}
            verticalLabelRotation={20}
            fromZero
          />
        </View>
      </TouchableOpacity>
    );
  };

  const handleSensorPress = () => {
    navigation.navigate('sensor-detail', { sensorData: JSON.stringify(sensorData), latestData: JSON.stringify(latestData) });
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <Text style={styles.header}>Device Monitor</Text>
          </View>

          <Text style={styles.subHeader}>Sensor Status Overview</Text>

          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <TouchableOpacity onPress={handleSensorPress}>
            <View style={styles.sensorCard}>
              <FontAwesome5 name="microchip" size={20} color="black" />
              <Text style={styles.sensorTitle}>Sensor IBS-TH3</Text>
            </View>
          </TouchableOpacity>

          {latestData ? (
            <>
              <TouchableOpacity onPress={() => setShowTempChart(!showTempChart)}>
                <View style={styles.dataCard}>
                  <FontAwesome5 name="temperature-high" size={20} color="#3b82f6" />
                  <View style={styles.dataText}>
                    <Text style={styles.dataTitle}>Temperature</Text>
                    <Text style={styles.dataValue}>{latestData.temperature !== null ? `${latestData.temperature}°C` : 'N/A'}</Text>
                    <Text style={styles.dataUpdate}>Updated {new Date(latestData.updatedAt).toLocaleString()}</Text>
                  </View>
                  <MaterialIcons name={showTempChart ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color="black" />
                </View>
              </TouchableOpacity>
              {showTempChart && renderChart(sensorData?.temperature, '#3b82f6', 'temperature')}

              <TouchableOpacity onPress={() => setShowHumidityChart(!showHumidityChart)}>
                <View style={styles.dataCard}>
                  <FontAwesome5 name="tint" size={20} color="#f59e0b" />
                  <View style={styles.dataText}>
                    <Text style={styles.dataTitle}>Humidity</Text>
                    <Text style={styles.dataValue}>{latestData.humidity !== null ? `${latestData.humidity}%` : 'N/A'}</Text>
                    <Text style={styles.dataUpdate}>Updated {new Date(latestData.updatedAt).toLocaleString()}</Text>
                  </View>
                  <MaterialIcons name={showHumidityChart ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color="black" />
                </View>
              </TouchableOpacity>
              {showHumidityChart && renderChart(sensorData?.humidity, '#f59e0b', 'humidity')}

              <TouchableOpacity onPress={() => setShowDewPointChart(!showDewPointChart)}>
                <View style={styles.dataCard}>
                  <FontAwesome5 name="cloud-rain" size={20} color="#06b6d4" />
                  <View style={styles.dataText}>
                    <Text style={styles.dataTitle}>Dew Point</Text>
                    <Text style={styles.dataValue}>{latestData.dewPoint !== null ? `${latestData.dewPoint}°C` : 'N/A'}</Text>
                    <Text style={styles.dataUpdate}>Updated {new Date(latestData.updatedAt).toLocaleString()}</Text>
                  </View>
                  <MaterialIcons name={showDewPointChart ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color="black" />
                </View>
              </TouchableOpacity>
              {showDewPointChart && renderChart(sensorData?.dewPoint, '#06b6d4', 'dewPoint')}

              <TouchableOpacity onPress={() => setShowVpoChart(!showVpoChart)}>
                <View style={styles.dataCard}>
                  <FontAwesome5 name="wind" size={20} color="#22c55e" />
                  <View style={styles.dataText}>
                    <Text style={styles.dataTitle}>Vapor Pressure Deficit (VPO)</Text>
                    <Text style={styles.dataValue}>{latestData.vpo !== null ? `${latestData.vpo} kPa` : 'N/A'}</Text>
                    <Text style={styles.dataUpdate}>Updated {new Date(latestData.updatedAt).toLocaleString()}</Text>
                  </View>
                  <MaterialIcons name={showVpoChart ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color="black" />
                </View>
              </TouchableOpacity>
              {showVpoChart && renderChart(sensorData?.vpo, '#22c55e', 'vpo')}
            </>
          ) : (
            <Text style={styles.noDataText}>Loading sensor data...</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: isIOS ? 0 : StatusBar.currentHeight },
  scrollContainer: { flex: 1 },
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  headerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { padding: 10 },
  header: { fontSize: 24, fontWeight: 'bold', marginLeft: 10 },
  subHeader: { fontSize: 16, color: 'gray', marginBottom: 20, marginLeft: 10 },
  sensorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sensorTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 12 },
  dataCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dataText: { marginLeft: 12, flex: 1 },
  dataTitle: { fontSize: 14, color: 'gray' },
  dataValue: { fontSize: 20, fontWeight: 'bold' },
  dataUpdate: { fontSize: 12, color: 'gray' },
  noDataText: { textAlign: 'center', marginVertical: 16, color: 'gray' },
  errorContainer: { backgroundColor: '#F8D7DA', padding: 10, borderRadius: 8, marginBottom: 20 },
  errorText: { color: '#721C24', textAlign: 'center' },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  chartStyle: { borderRadius: 16 },
});