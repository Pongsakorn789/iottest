import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch, TouchableOpacity, SafeAreaView, Dimensions, Platform, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

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

export default function SensorDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const { sensorData, latestData } = route.params || {};
  const parsedSensorData = JSON.parse(sensorData || '[]');
  const parsedLatestData = JSON.parse(latestData || '{}');
  const [currentIssues, setCurrentIssues] = useState([]);
  const [sensorEnabled, setSensorEnabled] = useState(true);

  useEffect(() => {
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

        console.log('API Response Data:', data);

        if (!data.data || data.data.length === 0) throw new Error("ไม่มีข้อมูลเซ็นเซอร์");

        const issues = data.data.map(entry => {
          const errors = [];
          if (entry.temperature === 0 && entry.humidity === 0) {
            errors.push({ type: 'ไฟดับ', timestamp: entry.timestamp, details: 'ทุกค่าของเซ็นเซอร์เป็น 0' });
          }
          if (entry.temperature === null || entry.humidity === null) {
            errors.push({ type: 'เซ็นเซอร์เสีย', timestamp: entry.timestamp, details: 'ข้อมูลเซ็นเซอร์หายไป' });
          }
          return errors;
        }).flat();

        setCurrentIssues(issues);
      } catch (error) {
        console.error("ข้อผิดพลาดในการดึงข้อมูลเซ็นเซอร์:", error);
      }
    };

    fetchSensorData();
  }, []);

  const handleViewErrorHistory = () => {
    navigation.navigate('error-history', { errorHistory: JSON.stringify(currentIssues) });
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
            <Text style={styles.header}>System Status</Text>
            <Switch 
              value={sensorEnabled} 
              onValueChange={setSensorEnabled}
              trackColor={{ false: '#ccc', true: '#4CAF50' }} 
              style={styles.switch}
            />
          </View>

          <View style={styles.sensorContainer}>
            <Text style={styles.sensorText}>Sensor IBS-TH3</Text>
          </View>

          <View style={styles.statusGrid}>
            <View style={[styles.statusBox, { backgroundColor: '#E7F8E9' }]}>
              <Icon name="wifi" size={24} color="#4CAF50" />
              <Text style={styles.statusTitle}>WiFi Status</Text>
              <Text style={styles.statusText}>Connected</Text>
            </View>
            <View style={[styles.statusBox, { backgroundColor: '#FFF3CD' }]}>
              <Icon name="battery-alert" size={24} color="#FFA000" />
              <Text style={styles.statusTitle}>Battery Status</Text>
              <Text style={styles.statusText}>20%</Text>
            </View>
            <View style={[styles.statusBox, { backgroundColor: '#E3EAFD' }]}>
              <Icon name="data-usage" size={24} color="#1976D2" />
              <Text style={styles.statusTitle}>Data Status</Text>
              <Text style={styles.statusText}>Normal</Text>
            </View>
            <View style={[styles.statusBox, { backgroundColor: '#FDE8E8' }]}>
              <Icon name="error" size={24} color="#D32F2F" />
              <Text style={styles.statusTitle}>Device Health</Text>
              <Text style={styles.statusText}>Error</Text>
            </View>
          </View>

          <Text style={styles.subHeader}>Current Issues</Text>
          
          {currentIssues.length > 0 ? (
            currentIssues.slice(0, 2).map((issue, index) => (
              <View key={index} style={styles.issueBox}>
                <Icon name="error" size={24} color="red" />
                <View style={styles.issueContent}>
                  <Text style={styles.issueTitle}>{issue.type}</Text>
                  <Text style={styles.issueText}>{issue.details}</Text>
                  <Text style={styles.issueTimestamp}>{issue.timestamp}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noIssuesBox}>
              <Icon name="check-circle" size={24} color="#4CAF50" />
              <Text style={styles.noIssuesText}>No current issues detected</Text>
            </View>
          )}

          <TouchableOpacity onPress={handleViewErrorHistory} style={styles.errorHistory}>
            <Icon name="history" size={24} color="#1976D2" />
            <Text style={styles.historyText}>View past error reports</Text>
          </TouchableOpacity>
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
    backgroundColor: '#F8FAFC' 
  },
  container: { 
    flex: 1, 
    padding: 16,
    paddingBottom: 30,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  backButton: {
    padding: 10,
  },
  header: { 
    fontSize: 24, 
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 10,
  },
  switch: {
    marginLeft: 10,
  },
  sensorContainer: { 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 16,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 2,
  },
  sensorText: { 
    fontSize: 18, 
    fontWeight: '500' 
  },
  statusGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },
  statusBox: { 
    width: '48%', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginBottom: 12,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 2, 
    elevation: 1,
  },
  statusTitle: { 
    fontSize: 14, 
    color: '#555',
    marginTop: 6,
  },
  statusText: { 
    fontSize: 16, 
    fontWeight: 'bold',
    marginTop: 4,
  },
  subHeader: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginTop: 20, 
    marginBottom: 14,
    marginLeft: 4,
  },
  issueBox: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 10,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 2,
  },
  issueContent: {
    marginLeft: 12,
    flex: 1,
  },
  issueTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: 'red' 
  },
  issueText: { 
    fontSize: 14, 
    color: '#333',
    marginTop: 4,
  },
  issueTimestamp: { 
    fontSize: 12, 
    color: '#555',
    marginTop: 4,
  },
  noIssuesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7F8E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  noIssuesText: {
    fontSize: 16,
    color: '#4CAF50',
    marginLeft: 12,
  },
  errorHistory: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 12, 
    marginTop: 16,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 2,
  },
  historyText: { 
    fontSize: 16, 
    color: '#1976D2', 
    marginLeft: 10 
  },
});