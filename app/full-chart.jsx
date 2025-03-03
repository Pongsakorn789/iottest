import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from 'expo-router';

const FullChart = () => {
  const { data, color, type } = useLocalSearchParams();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  let parsedData;
  try {
    parsedData = JSON.parse(data || '{}');
  } catch (e) {
    console.error('Failed to parse data:', e);
    parsedData = { labels: [], values: [] }; // ค่าเริ่มต้นหากเกิดข้อผิดพลาด
  }

  const hasValidData = parsedData && Array.isArray(parsedData.labels) && Array.isArray(parsedData.values);

  const filteredData = hasValidData
    ? parsedData.labels
        .map((label, index) => ({ label, value: parsedData.values[index] }))
        .filter(entry => {
          const entryDate = new Date(entry.label);
          return (
            entryDate.getFullYear() === selectedDate.getFullYear() &&
            entryDate.getMonth() === selectedDate.getMonth() &&
            entryDate.getDate() === selectedDate.getDate()
          );
        })
    : [];

  const chartData = {
    labels: filteredData.map(entry => {
      const date = new Date(entry.label);
      return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }),
    datasets: [{ data: filteredData.map(entry => entry.value) }],
  };

  const onChangeDate = (event, selected) => {
    setShowDatePicker(false);
    if (selected) setSelectedDate(selected);
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
      <View style={styles.container}>
        <Text style={styles.header}>{type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Chart'}</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
          <Text style={styles.datePickerText}>Select Date: {selectedDate.toLocaleDateString()}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onChangeDate}
          />
        )}
        {hasValidData ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.chartContentContainer}>
            <View style={styles.chartWrapper}>
              <BarChart
                data={chartData}
                width={filteredData.length * 60 || 300}
                height={400}
                yAxisLabel=""
                chartConfig={{
                  backgroundColor: '#FFF',
                  backgroundGradientFrom: '#FFF',
                  backgroundGradientTo: '#FFF',
                  decimalPlaces: 2,
                  color: (opacity = 1) => color || 'gray',
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                style={{ marginVertical: 8, borderRadius: 16 }}
              />
            </View>
          </ScrollView>
        ) : (
          <Text style={styles.noDataText}>No valid data available for this chart</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  contentContainer: { alignItems: 'center', paddingVertical: 20 },
  container: { flex: 1, padding: 25, backgroundColor: '#F8FAFC', alignItems: 'center' },
  header: { fontSize: 26, fontWeight: 'bold', marginBottom: 10 },
  datePickerButton: { marginVertical: 10, padding: 10, backgroundColor: '#FFF', borderRadius: 8 },
  datePickerText: { fontSize: 16, color: 'blue' },
  chartContentContainer: { paddingHorizontal: 20 },
  chartWrapper: { paddingHorizontal: 20 },
  noDataText: { fontSize: 16, color: 'gray', marginVertical: 20 },
});

export default FullChart;