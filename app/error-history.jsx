import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://172.16.22.142:3000';

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

export default function ErrorHistory() {
  const route = useRoute();
  const navigation = useNavigation();
  const { errorHistory } = route.params || {};
  const [errors, setErrors] = useState(JSON.parse(errorHistory || '[]'));
  const [apiErrors, setApiErrors] = useState([]);

  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/api/user/sensor-data`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        console.log('API Response Status (ErrorHistory):', response.status);
        console.log('API Response Headers (ErrorHistory):', response.headers);

        if (response.status === 401) {
          await AsyncStorage.removeItem('token');
          navigation.replace('/signin');
          throw new Error('Session expired. Please log in again.');
        }

        const data = await response.json();

        console.log('API Response Data (ErrorHistory):', data);

        if (!data.data || data.data.length === 0) throw new Error("ไม่มีข้อมูลเซ็นเซอร์");

        const issues = data.data.map(entry => {
          const errors = [];
          if (
            entry.temperature === 0 &&
            entry.humidity === 0 &&
            (entry.co2 === 0 || entry.co2 === undefined) &&
            (entry.ec === 0 || entry.ec === undefined) &&
            (entry.ph === 0 || entry.ph === undefined)
          ) {
            errors.push({ type: 'ไฟดับ', timestamp: entry.timestamp, details: 'ทุกค่าของเซ็นเซอร์ (อุณหภูมิ, ความชื้น, CO2, EC, pH) เป็น 0' });
          }
          if ((entry.ec === 0 || entry.ec === undefined) || (entry.ph === 0 || entry.ph === undefined)) {
            errors.push({ type: 'ถ่านหมด', timestamp: entry.timestamp, details: 'ค่า EC หรือ pH เป็น 0' });
          }
          if (entry.ph !== undefined && (entry.ph < 3 || entry.ph > 10)) {
            errors.push({ type: 'เซ็นเซอร์เสีย', timestamp: entry.timestamp, details: 'ค่า pH อยู่นอกช่วง 3-10' });
          }
          if (entry.co2 !== undefined && entry.co2 < 200) {
            errors.push({ type: 'เซ็นเซอร์เสีย', timestamp: entry.timestamp, details: 'ค่า CO2 ต่ำกว่า 200 ppm' });
          }
          return errors;
        }).flat().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        setApiErrors(issues);
      } catch (error) {
        console.error("ข้อผิดพลาดในการดึงข้อมูลประวัติข้อผิดพลาด:", error);
      }
    };

    fetchSensorData();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.errorItem}>
      <Text style={styles.errorTitle}>{item.type}</Text>
      <Text style={styles.errorDetails}>{item.details}</Text>
      <Text style={styles.errorTimestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      data={apiErrors}
      renderItem={renderItem}
      keyExtractor={(item, index) => index.toString()}
      ListEmptyComponent={<Text style={styles.noDataText}>No errors found.</Text>}
      ListHeaderComponent={<Text style={styles.header}>Error History</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F8FAFC' },
  header: { fontSize: 26, fontWeight: 'bold', marginBottom: 15, paddingHorizontal: 10 }, // เพิ่ม padding เพื่อจัดวาง
  errorItem: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  errorTitle: { fontSize: 16, fontWeight: 'bold', color: 'red' },
  errorDetails: { fontSize: 14, color: '#333', marginTop: 5 },
  errorTimestamp: { fontSize: 12, color: '#555', marginTop: 5 },
  noDataText: { textAlign: 'center', marginVertical: 16, color: 'gray' },
});