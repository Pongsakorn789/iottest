import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  Platform
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Dropdown } from "react-native-element-dropdown";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter, useNavigation } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const windowWidth = Dimensions.get("window").width;
const windowHeight = Dimensions.get("window").height;
const isIOS = Platform.OS === 'ios';
const API_URL = "http://192.168.1.12:3000/api/user/sensor-data";

export default function Statistics() {
  const navigation = useNavigation();
  const [selectedMetrics, setSelectedMetrics] = useState(["Temperature", "Humidity", "Dew Point"]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(windowWidth * 0.9);

  const sensors = [
    { label: "Sensor IBS-TH3", value: "Sensor IBS-TH3" },
    { label: "Sensor X-200", value: "Sensor X-200" },
  ];

  useEffect(() => {
    const today = new Date();
    setStartDate(today);
    setEndDate(today);
    setTempStartDate(today);
    setTempEndDate(today);

    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    fetchSensorData(today.toISOString().split("T")[0], today.toISOString().split("T")[0]);

    // ปรับขนาดกราฟตามข้อมูล
    const updateChartWidth = () => {
      const minWidth = windowWidth * 0.9;
      const dataPoints = data.length;
      const calculatedWidth = Math.max(minWidth, dataPoints * 80);
      setChartWidth(calculatedWidth);
    };

    updateChartWidth();

    return () => clearInterval(interval);
  }, [data.length]);

  const calculateDewPoint = (temperature, humidity) => {
    if (temperature === null || humidity === null) return null;
    
    // คำนวณ Dew Point โดยใช้สูตรที่แม่นยำมากขึ้น
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temperature) / (b + temperature)) + Math.log(humidity / 100);
    return (b * alpha) / (a - alpha);
  };

  const calculateHourlyAverages = (data) => {
    const hourlyData = {};

    data.forEach((item) => {
      const date = new Date(item.timestamp);
      const hour = date.getHours();
      const key = `${hour}:00`;

      if (!hourlyData[key]) {
        hourlyData[key] = {
          temperature: 0,
          humidity: 0,
          dewPoint: 0,
          count: 0,
        };
      }

      if (item.temperature !== null) {
        hourlyData[key].temperature += item.temperature;
        hourlyData[key].count += 1;
      }
      if (item.humidity !== null) {
        hourlyData[key].humidity += item.humidity;
      }
    });

    const averagedData = Object.keys(hourlyData)
      .sort((a, b) => {
        // เรียงตามชั่วโมง
        const hourA = parseInt(a.split(':')[0]);
        const hourB = parseInt(b.split(':')[0]);
        return hourA - hourB;
      })
      .map((hour) => {
        const avgTemperature = hourlyData[hour].count
          ? hourlyData[hour].temperature / hourlyData[hour].count
          : 0;
        const avgHumidity = hourlyData[hour].count
          ? hourlyData[hour].humidity / hourlyData[hour].count
          : 0;
        const dewPoint = calculateDewPoint(avgTemperature, avgHumidity);

        return {
          hour,
          temperature: parseFloat(avgTemperature.toFixed(1)),
          humidity: parseFloat(avgHumidity.toFixed(1)),
          dewPoint: dewPoint ? parseFloat(dewPoint.toFixed(1)) : 0,
        };
      });

    return averagedData;
  };

  const fetchSensorData = async (start, end) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Please log in again.");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}?startDate=${start}&endDate=${end}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (response.ok) {
        if (!result.data || !Array.isArray(result.data)) {
          Alert.alert("Error", "No sensor data available.");
          setData([]);
        } else {
          const averagedData = calculateHourlyAverages(result.data);
          console.log("Averaged Data:", averagedData);
          setData(averagedData);
        }
      } else {
        Alert.alert("Error", result.message || "Failed to fetch sensor data.");
      }
    } catch (err) {
      Alert.alert("Error", "Network error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMetric = (metric) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    );
  };

  const onStartDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || tempStartDate;
    setTempStartDate(currentDate);
  };

  const onEndDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || tempEndDate;
    setTempEndDate(currentDate);
  };

  const confirmStartDate = () => {
    setStartDate(tempStartDate);
    fetchSensorData(tempStartDate.toISOString().split("T")[0], endDate.toISOString().split("T")[0]);
    setShowStartPicker(false);
  };

  const confirmEndDate = () => {
    setEndDate(tempEndDate);
    fetchSensorData(startDate.toISOString().split("T")[0], tempEndDate.toISOString().split("T")[0]);
    setShowEndPicker(false);
  };

  const cancelPicker = () => {
    setShowStartPicker(false);
    setShowEndPicker(false);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const chartData = {
    labels: data.map((item) => item.hour),
    datasets: [
      selectedMetrics.includes("Temperature") && {
        data: data.map((item) => item.temperature || 0),
        color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
        strokeWidth: 3,
      },
      selectedMetrics.includes("Humidity") && {
        data: data.map((item) => item.humidity || 0),
        color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
        strokeWidth: 3,
      },
      selectedMetrics.includes("Dew Point") && {
        data: data.map((item) => item.dewPoint || 0),
        color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
        strokeWidth: 3,
      },
    ].filter(Boolean),
    legend: selectedMetrics,
  };

  const finalData = chartData.datasets.length > 0
    ? chartData
    : {
        ...chartData,
        datasets: [{ data: [0, 0, 0, 0, 0, 0, 0], color: () => "transparent" }],
      };

  const formatDate = (date) => {
    if (!date) return "";
    // รูปแบบวันที่ dd/mm/yyyy ในรูปแบบไทย เช่น 02/03/2568 BE
    const thaiYear = date.getFullYear() + 543; // แปลงเป็นปี พ.ศ.
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${thaiYear} BE`;
  };

  const formatTime = (date) => {
    if (!date) return "";
    return date.toLocaleTimeString();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Statistics</Text>
          <View style={styles.placeholder} />
        </View>

        <Text style={styles.currentDateText}>
          Current Date and Time: {formatDate(currentDate)} {formatTime(currentDate)}
        </Text>

        <View style={styles.dropdownContainer}>
          <Dropdown
            style={styles.dropdown}
            placeholderStyle={styles.dropdownPlaceholder}
            selectedTextStyle={styles.dropdownSelectedText}
            inputSearchStyle={styles.dropdownInputSearch}
            data={sensors}
            search
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="Select Sensor"
            searchPlaceholder="Search..."
            value={selectedSensor}
            onChange={(item) => setSelectedSensor(item.value)}
          />
        </View>

        <Text style={styles.dateRangeText}>SELECT DATE RANGE</Text>

        <View style={styles.datePickerContainer}>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowStartPicker(true)}
          >
            <FontAwesome5 name="calendar" size={16} color="#1E90FF" style={styles.calendarIcon} />
            <Text style={styles.dateText}>{formatDate(startDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowEndPicker(true)}
          >
            <FontAwesome5 name="calendar" size={16} color="#1E90FF" style={styles.calendarIcon} />
            <Text style={styles.dateText}>{formatDate(endDate)}</Text>
          </TouchableOpacity>
        </View>

        {/* Modal สำหรับ Start Date Picker */}
        <Modal visible={showStartPicker} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>Select Start Date</Text>
              <DateTimePicker
                value={tempStartDate}
                mode="date"
                display="default"
                onChange={onStartDateChange}
              />
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={cancelPicker}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={confirmStartDate}>
                  <Text style={styles.buttonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal สำหรับ End Date Picker */}
        <Modal visible={showEndPicker} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>Select End Date</Text>
              <DateTimePicker
                value={tempEndDate}
                mode="date"
                display="default"
                onChange={onEndDateChange}
              />
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={cancelPicker}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={confirmEndDate}>
                  <Text style={styles.buttonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.metricContainer}>
          {["Temperature", "Humidity", "Dew Point"].map((metric) => (
            <TouchableOpacity
              key={metric}
              onPress={() => toggleMetric(metric)}
              style={[
                styles.metricButton,
                selectedMetrics.includes(metric) && {
                  backgroundColor:
                    metric === "Temperature"
                      ? "#FF6384"
                      : metric === "Humidity"
                      ? "#36A2EB"
                      : "#4BC0C0",
                },
              ]}
            >
              <FontAwesome5
                name={
                  metric === "Temperature"
                    ? "thermometer-half"
                    : metric === "Humidity"
                    ? "tint"
                    : "cloud"
                }
                size={14}
                color="#fff"
                style={styles.metricIcon}
              />
              <Text style={styles.metricText}>{metric}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading data...</Text>
          </View>
        ) : (
          <View style={styles.chartOuterContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chartScrollContainer}
            >
              <LineChart
                data={finalData}
                width={Math.max(chartWidth, data.length * 80)}
                height={220}
                chartConfig={{
                  backgroundColor: "#ffffff",
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#f8f9fa",
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: "5",
                    strokeWidth: "2",
                    stroke: "#fff",
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: "5, 5",
                    strokeWidth: 1,
                    stroke: "#e0e0e0",
                  },
                  propsForLabels: {
                    fontSize: 11,
                    fontWeight: "bold",
                  },
                  formatYLabel: (value) => value,
                }}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                withDots={true}
                withShadow={true}
                segments={5}
                fromZero={false}
                yAxisInterval={5}
                yAxisSuffix=""
                yAxisLabel=""
                legendStyle={styles.chartLegend}
              />
            </ScrollView>
            <View style={styles.legendContainer}>
              {selectedMetrics.includes("Temperature") && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: "#FF6384" }]} />
                  <Text style={styles.legendText}>Temperature</Text>
                </View>
              )}
              {selectedMetrics.includes("Humidity") && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: "#36A2EB" }]} />
                  <Text style={styles.legendText}>Humidity</Text>
                </View>
              )}
              {selectedMetrics.includes("Dew Point") && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: "#4BC0C0" }]} />
                  <Text style={styles.legendText}>Dew Point</Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Swipe the graph horizontally to view more data
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingTop: isIOS ? 0 : StatusBar.currentHeight,
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 10,
  },
  
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    flex: 1,
    textAlign: "left",
  },
  placeholder: {
    width: 44, 
  },
  currentDateText: {
    fontSize: 14,
    marginBottom: 16,
    color: "#555",
  },
  dropdownContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdown: {
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  dropdownPlaceholder: {
    color: "#666",
  },
  dropdownSelectedText: {
    color: "#000",
    fontWeight: "500",
  },
  dropdownInputSearch: {
    height: 40,
    fontSize: 16,
  },
  dateRangeText: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  datePickerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  datePickerButton: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateText: {
    fontSize: 13,
  },
  calendarIcon: {
    marginRight: 8,
  },
  metricContainer: {
    flexDirection: "row",
    marginBottom: 16,
    justifyContent: "center",
  },
  metricButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
  },
  metricIcon: {
    marginRight: 6,
  },
  metricText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  chartOuterContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  chartScrollContainer: {
    paddingBottom: 10,
  },
  chart: {
    borderRadius: 16,
    marginTop: 8,
  },
  chartLegend: {
    display: "none", 
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
    marginBottom: 5,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: "#444",
  },
  loadingContainer: {
    marginTop: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#555",
  },
  footer: {
    marginTop: 16,
    marginBottom: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },

  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  confirmButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});