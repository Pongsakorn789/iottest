import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { FontAwesome5 } from '@expo/vector-icons';

const API_URL = 'http://172.16.22.142:3000';
const screenWidth = 300;

const FullChart = () => {
  const { data: initialData, color, type } = useLocalSearchParams();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sensorData, setSensorData] = useState(null);

  useEffect(() => {
    const fetchFullSensorData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/user/sensor-data`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          setSensorData(data.data);
        }
      } catch (error) {
        console.error('Error fetching full sensor data:', error);
      }
    };
    fetchFullSensorData();
  }, []);

  const parsedData = sensorData || JSON.parse(initialData || '{}');
  const hasValidData = parsedData && Array.isArray(parsedData);

  const filteredData = hasValidData
    ? parsedData
        .filter(entry => {
          const entryDate = new Date(entry.timestamp);
          return (
            entryDate.getFullYear() === selectedDate.getFullYear() &&
            entryDate.getMonth() === selectedDate.getMonth() &&
            entryDate.getDate() === selectedDate.getDate()
          );
        })
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    : [];

  const chartData = {
    labels: filteredData.map(entry => {
      const date = new Date(entry.timestamp);
      return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }),
    datasets: [{
      data: filteredData.map(entry => {
        switch (type) {
          case 'temperature': return entry.temperature || 0;
          case 'humidity': return entry.humidity || 0;
          case 'dewPoint': return entry.dew_point || 0;
          case 'vpo': return entry.vpo || 0;
          default: return 0;
        }
      }),
    }],
  };

  const onChangeDate = (event, selected) => {
    setShowDatePicker(false);
    if (selected) setSelectedDate(selected);
  };

  const handleExportPress = async () => {
    if (filteredData.length === 0) {
      alert("No data available to export.");
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
          <h1>${type.charAt(0).toUpperCase() + type.slice(1)} Data Report</h1>
          <p>Date: ${selectedDate.toLocaleDateString('th-TH')}</p>
          <table>
            <tr>
              <th>Timestamp</th>
              <th>${type.charAt(0).toUpperCase() + type.slice(1)}</th>
            </tr>
            ${filteredData.map(entry => `
              <tr>
                <td>${new Date(entry.timestamp).toLocaleString('th-TH')}</td>
                <td>${entry[type === 'dewPoint' ? 'dew_point' : type] || 'N/A'}</td>
              </tr>
            `).join('')}
          </table>
          <div class="footer">Generated on ${new Date().toLocaleString('th-TH')}</div>
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
        dialogTitle: `Share ${type} Data PDF`,
        UTI: 'com.adobe.pdf',
      });

      alert("PDF exported successfully!");
    } catch (error) {
      alert("Failed to export PDF: " + error.message);
    }
  };

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#f0f4f8',
    decimalPlaces: 2,
    color: () => color || '#888',
    labelColor: () => '#333',
    strokeWidth: 2,
    barPercentage: 0.6,
    propsForBars: { rx: 4, ry: 4 },
    fillShadowGradient: color,
    fillShadowGradientOpacity: 0.6,
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
      <View style={styles.container}>
        <Text style={styles.header}>{type.charAt(0).toUpperCase() + type.slice(1)} Chart</Text>
        <View style={styles.dateExportContainer}>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
            <Text style={styles.datePickerText}>Select Date: {selectedDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExportPress} style={styles.exportButton}>
            <FontAwesome5 name="download" size={16} color="#fff" style={styles.exportIcon} />
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onChangeDate}
          />
        )}
        {filteredData.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <BarChart
              data={chartData}
              width={Math.max(screenWidth, filteredData.length * 60)}
              height={400}
              yAxisLabel=""
              chartConfig={chartConfig}
              style={styles.chartStyle}
              verticalLabelRotation={30}
              fromZero
            />
          </ScrollView>
        ) : (
          <Text style={styles.noDataText}>No data available for this date</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  contentContainer: { alignItems: 'center', paddingVertical: 20 },
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC', alignItems: 'center' },
  header: { fontSize: 26, fontWeight: 'bold', marginBottom: 20 },
  dateExportContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 10,
  },
  datePickerButton: { 
    flex: 1,
    padding: 10, 
    backgroundColor: '#FFF', 
    borderRadius: 8, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4 
  },
  datePickerText: { fontSize: 16, color: '#007AFF' },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28A745',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 10,
  },
  exportIcon: { marginRight: 6 },
  exportText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  chartStyle: { borderRadius: 16, marginVertical: 8 },
  noDataText: { fontSize: 16, color: 'gray', marginVertical: 20 },
});

export default FullChart;