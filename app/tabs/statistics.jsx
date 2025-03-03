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
import { useNavigation } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const windowWidth = Dimensions.get("window").width;
const windowHeight = Dimensions.get("window").height;
const isIOS = Platform.OS === 'ios';
const API_URL = "http://172.16.22.142:3000/api/user/sensor-data";

export default function Statistics() {
  const navigation = useNavigation();
  const [selectedMetrics, setSelectedMetrics] = useState(["Temperature", "Humidity", "Dew Point", "VPO"]);
  const [selectedSensor, setSelectedSensor] = useState("Sensor IBS-TH3");
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

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateChartWidth = () => {
      const minWidth = windowWidth * 0.9;
      const dataPoints = data.length;
      const calculatedWidth = Math.max(minWidth, dataPoints * 80);
      setChartWidth(calculatedWidth);
    };
    updateChartWidth();
  }, [data.length]);

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
          Alert.alert("Error", "No sensor data available for the selected date range.");
          setData([]);
        } else {
          const sortedData = result.data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          console.log("Fetched Data:", sortedData);
          setData(sortedData);
        }
      } else {
        Alert.alert("Error", result.message || "Failed to fetch sensor data.");
        setData([]);
      }
    } catch (err) {
      Alert.alert("Error", "Network error occurred: " + err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPress = async () => {
    if (data.length === 0) {
      Alert.alert("Error", "No data available to export.");
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <h1>Sensor Data Report</h1>
          <p>Sensor: ${selectedSensor}</p>
          <p>Date Range: ${formatDate(startDate)} - ${formatDate(endDate)}</p>
          <table>
            <tr>
              <th>Timestamp</th>
              ${selectedMetrics.includes("Temperature") ? "<th>Temperature (°C)</th>" : ""}
              ${selectedMetrics.includes("Humidity") ? "<th>Humidity (%)</th>" : ""}
              ${selectedMetrics.includes("Dew Point") ? "<th>Dew Point (°C)</th>" : ""}
              ${selectedMetrics.includes("VPO") ? "<th>VPO</th>" : ""}
            </tr>
            ${data.map(item => `
              <tr>
                <td>${new Date(item.timestamp).toLocaleString('th-TH')}</td>
                ${selectedMetrics.includes("Temperature") ? `<td>${item.temperature || "N/A"}</td>` : ""}
                ${selectedMetrics.includes("Humidity") ? `<td>${item.humidity || "N/A"}</td>` : ""}
                ${selectedMetrics.includes("Dew Point") ? `<td>${item.dew_point || "N/A"}</td>` : ""}
                ${selectedMetrics.includes("VPO") ? `<td>${item.vpo || "N/A"}</td>` : ""}
              </tr>
            `).join('')}
          </table>
          <div class="footer">Generated on ${formatDate(new Date())} ${formatTime(new Date())}</div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share PDF Report',
        UTI: 'com.adobe.pdf',
      });

      Alert.alert("Success", "PDF exported successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to export PDF: " + error.message);
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
    setShowStartPicker(false);
    setShowEndPicker(true);
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

  const chartData = {
    labels: data.map((item) => {
      const date = new Date(item.timestamp);
      const daysDiff = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
      return daysDiff <= 2
        ? date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
    }),
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
        data: data.map((item) => item.dew_point || 0),
        color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
        strokeWidth: 3,
      },
      selectedMetrics.includes("VPO") && {
        data: data.map((item) => item.vpo || 0),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        strokeWidth: 3,
      },
    ].filter(Boolean),
    legend: selectedMetrics,
  };

  const finalData = chartData.datasets.length > 0
    ? chartData
    : {
        ...chartData,
        datasets: [{ data: [0, 0, 0], color: () => "transparent" }],
      };

  const formatDate = (date) => {
    if (!date) return "";
    const thaiYear = date.getFullYear() + 543;
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

        <View style={styles.dateExportContainer}>
          <Text style={styles.dateRangeText}>SELECT DATE RANGE</Text>
          <TouchableOpacity style={styles.exportButton} onPress={handleExportPress}>
            <FontAwesome5 name="download" size={16} color="#fff" style={styles.exportIcon} />
            <Text style={styles.exportText}>Export Data</Text>
          </TouchableOpacity>
        </View>

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
          {["Temperature", "Humidity", "Dew Point", "VPO"].map((metric) => (
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
                      : metric === "Dew Point"
                      ? "#4BC0C0"
                      : "#22C55E",
                },
              ]}
            >
              <FontAwesome5
                name={
                  metric === "Temperature"
                    ? "thermometer-half"
                    : metric === "Humidity"
                    ? "tint"
                    : metric === "Dew Point"
                    ? "cloud"
                    : "wind"
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
        ) : data.length === 0 ? (
          <Text style={styles.noDataText}>No data available for the selected date range.</Text>
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
                  style: { borderRadius: 16 },
                  propsForDots: { r: "5", strokeWidth: "2", stroke: "#fff" },
                  propsForBackgroundLines: { strokeDasharray: "5, 5", strokeWidth: 1, stroke: "#e0e0e0" },
                  propsForLabels: { fontSize: 11, fontWeight: "bold" },
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
              {selectedMetrics.includes("VPO") && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: "#22C55E" }]} />
                  <Text style={styles.legendText}>VPO</Text>
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
  dateExportContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dateRangeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#28A745",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  exportIcon: {
    marginRight: 6,
  },
  exportText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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
    flexWrap: "wrap",
  },
  metricButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    marginBottom: 8,
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
  noDataText: {
    textAlign: 'center',
    marginVertical: 16,
    color: 'gray',
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