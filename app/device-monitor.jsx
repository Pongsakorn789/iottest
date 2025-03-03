import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, Platform, StatusBar } from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Battery from 'expo-battery';
import { BarChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.12:3000';
const screenWidth = Dimensions.get('window').width;
const isIOS = Platform.OS === 'ios';

const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found. Please log in.');
    }
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
  const [sensorEnabled, setSensorEnabled] = useState(true);
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
        const response = await fetch(`${API_URL}/api/user/sensor-data`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
  
        console.log('API Response Status:', response.status);
        console.log('API Response Headers:', response.headers);
  
        if (response.status === 401) {
          await AsyncStorage.removeItem('token');
          navigation.replace('/signin');
          throw new Error('Session expired. Please log in again.');
        }
  
        const data = await response.json();
  
        console.log('Raw API Data:', data.data);
  
        if (!data.data || data.data.length === 0) {
          throw new Error("ไม่มีข้อมูลเซ็นเซอร์");
        }
  
        // กรองข้อมูลให้เหลือเฉพาะ 5 ชั่วโมงล่าสุด
        const fiveHoursAgo = new Date();
        fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);
  
        const validData = data.data
          .filter(entry => {
            if (!entry.timestamp) return false; // ตรวจสอบว่า timestamp มีหรือไม่
            const entryTime = new Date(entry.timestamp);
            return !isNaN(entryTime.getTime()) && // ตรวจสอบว่า timestamp สามารถแปลงเป็นวันที่ได้
              (entryTime >= fiveHoursAgo) && // อยู่ใน 5 ชั่วโมงล่าสุด
              (typeof entry.temperature === 'number' || entry.temperature === null) &&
              (typeof entry.humidity === 'number' || entry.humidity === null);
          })
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // เรียงจากใหม่ไปเก่า
  
        let limitedData;
        if (validData.length === 0) {
          // ถ้าไม่มีข้อมูลใน 5 ชั่วโมงล่าสุด ใช้ข้อมูลทั้งหมดที่มี (จำกัด 5 ค่าล่าสุด)
          const allValidData = data.data
            .filter(entry => {
              if (!entry.timestamp) return false;
              const entryTime = new Date(entry.timestamp);
              return !isNaN(entryTime.getTime()) && // ตรวจสอบว่า timestamp สามารถแปลงเป็นวันที่ได้
                (typeof entry.temperature === 'number' || entry.temperature === null) &&
                (typeof entry.humidity === 'number' || entry.humidity === null);
            })
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
          if (allValidData.length === 0) {
            throw new Error("ไม่มีข้อมูลเซ็นเซอร์ที่ถูกต้อง");
          }
  
          limitedData = allValidData.slice(0, 5); // ใช้ 5 ค่าล่าสุดจากข้อมูลทั้งหมด
          setErrorMessage("ไม่มีข้อมูลใน 5 ชั่วโมงล่าสุด ใช้ข้อมูลล่าสุดแทน");
        } else {
          limitedData = validData.slice(0, 5); // ใช้ 5 ค่าล่าสุดจาก 5 ชั่วโมง
          setErrorMessage(null);
        }
  
        const latestEntry = limitedData[0]; // ใช้รายการล่าสุดเป็น latestData
        let dewPoint = null;
        let vpo = null;
        if (latestEntry.temperature !== null && latestEntry.humidity !== null) {
          // คำนวณ Dew Point (จุดน้ำค้าง) โดยประมาณ ใช้สูตร Magnus
          const a = 17.27;
          const b = 237.7; // หน่วย °C
          const alpha = ((a * latestEntry.temperature) / (b + latestEntry.temperature)) + Math.log(latestEntry.humidity / 100);
          dewPoint = (b * alpha) / (a - alpha); // หน่วย °C
          dewPoint = parseFloat(dewPoint.toFixed(2));
  
          // คำนวณ Vapor Pressure Deficit (VPO) โดยประมาณ (หน่วย kPa)
          const saturationVaporPressure = 0.6108 * Math.exp((17.27 * latestEntry.temperature) / (latestEntry.temperature + 237.3)); // kPa
          const actualVaporPressure = saturationVaporPressure * (latestEntry.humidity / 100);
          vpo = parseFloat((saturationVaporPressure - actualVaporPressure).toFixed(2));
        }
  
        setLatestData({ 
          temperature: latestEntry.temperature, 
          humidity: latestEntry.humidity,
          dewPoint: dewPoint, 
          vpo: vpo,           
          updatedAt: latestEntry.timestamp 
        });
  
        setSensorData({
          temperature: { 
            labels: limitedData.map(entry => entry.timestamp), 
            values: limitedData.map(entry => entry.temperature || 0) 
          },
          humidity: { 
            labels: limitedData.map(entry => entry.timestamp), 
            values: limitedData.map(entry => entry.humidity || 0) 
          },
          dewPoint: { 
            labels: limitedData.map(entry => entry.timestamp), 
            values: limitedData.map(entry => {
              if (entry.temperature !== null && entry.humidity !== null) {
                const a = 17.27;
                const b = 237.7;
                const alpha = ((a * entry.temperature) / (b + entry.temperature)) + Math.log(entry.humidity / 100);
                return parseFloat(((b * alpha) / (a - alpha)).toFixed(2));
              }
              return 0;
            }) 
          },
          vpo: { 
            labels: limitedData.map(entry => entry.timestamp), 
            values: limitedData.map(entry => {
              if (entry.temperature !== null && entry.humidity !== null) {
                const saturationVaporPressure = 0.6108 * Math.exp((17.27 * entry.temperature) / (entry.temperature + 237.3));
                const actualVaporPressure = saturationVaporPressure * (entry.humidity / 100);
                return parseFloat((saturationVaporPressure - actualVaporPressure).toFixed(2));
              }
              return 0;
            }) 
          },
        });
      } catch (error) {
        console.error("ข้อผิดพลาดในการดึงข้อมูลเซ็นเซอร์:", error);
        setErrorMessage(error.message || "ไม่สามารถดึงข้อมูลเซ็นเซอร์ได้ กรุณาลองอีกครั้งในภายหลัง");
        setSensorData({ 
          temperature: { labels: [], values: [] }, 
          humidity: { labels: [], values: [] }, 
          dewPoint: { labels: [], values: [] }, 
          vpo: { labels: [], values: [] } 
        });
        setLatestData(null);
      }
    };
  
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 3600000); // อัปเดตทุก 1 ชั่วโมง
    return () => clearInterval(interval);
  }, []);

  const renderChart = (data, color, type) => {
    if (!data || !data.labels || !data.values || data.values.length === 0) {
      return <Text style={styles.noDataText}>ไม่มีข้อมูลที่ถูกต้อง</Text>;
    }

    // ใช้ข้อมูลทั้งหมดจาก sensorData (5 ค่าล่าสุดจาก 5 ชั่วโมง)
    const latestLabels = data.labels.map(timestamp => {
      const date = new Date(timestamp);
      return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    });

    const latestValues = data.values;

    const chartConfig = {
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#f0f4f8',
      decimalPlaces: 1,
      color: (opacity = 1) => `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
      labelColor: (opacity = 1) => `rgba(50, 50, 50, ${opacity})`,
      strokeWidth: 2,
      barPercentage: 0.7,
      useShadowColorFromDataset: false,
      propsForBars: { rx: 4, ry: 4 },
      propsForBackgroundLines: { strokeDashArray: '' },
      fillShadowGradient: color,
      fillShadowGradientOpacity: 0.8,
    };

    return (
      <TouchableOpacity onPress={() => navigation.navigate('full-chart', { data: JSON.stringify(data), color, type })}>
        <View style={styles.chartContainer}>
          <BarChart
            data={{ labels: latestLabels, datasets: [{ data: latestValues }] }}
            width={screenWidth - 50}
            height={220}
            yAxisLabel=""
            chartConfig={chartConfig}
            style={styles.chartStyle}
            verticalLabelRotation={30}
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
              <View style={styles.sensorHeader}>
                <FontAwesome5 name="microchip" size={20} color="black" />
                <Text style={styles.sensorTitle}>Sensor IBS-TH3</Text>
              </View>
            </View>
          </TouchableOpacity>

          {latestData ? (
            <>
              <TouchableOpacity onPress={() => setShowTempChart(!showTempChart)}>
                <View style={styles.dataCard}>
                  <FontAwesome5 name="temperature-high" size={20} color="blue" />
                  <View style={styles.dataText}>
                    <Text style={styles.dataTitle}>Temperature</Text>
                    <Text style={styles.dataValue}>{latestData.temperature !== null ? `${latestData.temperature}°C` : 'N/A'}</Text>
                    <Text style={styles.dataUpdate}>Updated {latestData.updatedAt}</Text>
                  </View>
                  <MaterialIcons name={showTempChart ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color="black" />
                </View>
              </TouchableOpacity>
              {showTempChart && renderChart(sensorData?.temperature, '#3b82f6', 'temperature')}

              <TouchableOpacity onPress={() => setShowHumidityChart(!showHumidityChart)}>
                <View style={styles.dataCard}>
                  <FontAwesome5 name="tint" size={20} color="orange" />
                  <View style={styles.dataText}>
                    <Text style={styles.dataTitle}>Humidity</Text>
                    <Text style={styles.dataValue}>{latestData.humidity !== null ? `${latestData.humidity}%` : 'N/A'}</Text>
                    <Text style={styles.dataUpdate}>Updated {latestData.updatedAt}</Text>
                  </View>
                  <MaterialIcons name={showHumidityChart ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color="black" />
                </View>
              </TouchableOpacity>
              {showHumidityChart && renderChart(sensorData?.humidity, '#f59e0b', 'humidity')}

              <TouchableOpacity onPress={() => setShowDewPointChart(!showDewPointChart)}>
                <View style={styles.dataCard}>
                  <FontAwesome5 name="cloud-rain" size={20} color="cyan" />
                  <View style={styles.dataText}>
                    <Text style={styles.dataTitle}>Dew Point</Text>
                    <Text style={styles.dataValue}>{latestData.dewPoint !== null ? `${latestData.dewPoint}°C` : 'N/A'}</Text>
                    <Text style={styles.dataUpdate}>Updated {latestData.updatedAt}</Text>
                  </View>
                  <MaterialIcons name={showDewPointChart ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color="black" />
                </View>
              </TouchableOpacity>
              {showDewPointChart && renderChart(sensorData?.dewPoint, '#06b6d4', 'dewPoint')}

              <TouchableOpacity onPress={() => setShowVpoChart(!showVpoChart)}>
                <View style={styles.dataCard}>
                  <FontAwesome5 name="wind" size={20} color="green" />
                  <View style={styles.dataText}>
                    <Text style={styles.dataTitle}>Vapor Pressure Deficit (VPO)</Text>
                    <Text style={styles.dataValue}>{latestData.vpo !== null ? `${latestData.vpo} kPa` : 'N/A'}</Text>
                    <Text style={styles.dataUpdate}>Updated {latestData.updatedAt}</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: isIOS ? 0 : StatusBar.currentHeight,
  },
  scrollContainer: {
    flex: 1,
  },
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: '#F8FAFC',
    paddingBottom: 30,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  backButton: {
    padding: 10,
  },
  header: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginLeft: 10,
  },
  subHeader: { 
    fontSize: 16, 
    color: 'gray', 
    marginBottom: 20,
    marginLeft: 10,
  },
  sensorCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 20,
    marginHorizontal: 2,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 2,
  },
  sensorHeader: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  sensorTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginLeft: 12 
  },
  dataCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 15, 
    marginHorizontal: 2,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 2 
  },
  dataText: { 
    marginLeft: 12, 
    flex: 1 
  },
  dataTitle: { 
    fontSize: 14, 
    color: 'gray' 
  },
  dataValue: { 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  dataUpdate: { 
    fontSize: 12, 
    color: 'gray' 
  },
  noDataText: { 
    textAlign: 'center', 
    marginVertical: 16, 
    color: 'gray' 
  },
  errorContainer: { 
    backgroundColor: '#F8D7DA', 
    padding: 10, 
    borderRadius: 8, 
    marginBottom: 20,
    marginHorizontal: 2,
  },
  errorText: { 
    color: '#721C24', 
    textAlign: 'center' 
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    marginVertical: 8,
    marginHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center',
  },
  chartStyle: {
    borderRadius: 16,
    paddingRight: 0,
  },
});