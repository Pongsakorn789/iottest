import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Text, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';

const API_URL = 'http://192.168.1.12:3000';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [secureText, setSecureText] = useState(true);
  const router = useRouter();

  // ฟังก์ชันแสดง Toast
  const showToast = (type, title, message) => {
    Toast.show({
      type,
      text1: title,
      text2: message,
    });
  };

  // ฟังก์ชันตรวจสอบ Validation
  const validateFields = () => {
    let valid = true;

    if (!email) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Invalid email format');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else {
      setPasswordError('');
    }

    return valid;
  };

  // ฟังก์ชัน Sign In
  const handleSignIn = async () => {
    // ปิด Keyboard
    Keyboard.dismiss();

    if (!validateFields()) return;

    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      showToast('error', 'No Internet Connection', 'Please check your connection and try again.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('email', email);

        showToast('success', 'Login Successful', 'You have successfully signed in.');
        router.push('/tabs/home');
      } else if (response.status === 401) {
        showToast('error', 'Login Failed', 'Invalid email or password.');
      } else {
        showToast('error', 'Login Failed', data.message || 'Something went wrong.');
      }
    } catch (error) {
      showToast('error', 'Network Error', error.message || 'Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>
      
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={[styles.input, emailError ? styles.inputError : null]}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
      
      <Text style={styles.label}>Password</Text>
      <View style={[styles.passwordContainer, passwordError ? styles.inputError : null]}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secureText}
        />
        <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.icon}>
          <MaterialIcons name={secureText ? "visibility-off" : "visibility"} size={24} color="gray" />
        </TouchableOpacity>
      </View>
      {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
      
      <TouchableOpacity onPress={() => router.push('/auth/forgot-password')} disabled={loading}>
        <Text style={styles.forgotPassword}>Forgot Password?</Text>
      </TouchableOpacity>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Signing in...</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
      )}
      
      <Text style={styles.orText}>Or continue with</Text>
      
      <TouchableOpacity style={styles.socialButton}>
        <FontAwesome name="google" size={20} color="black" />
        <Text style={styles.socialText}>Continue with Google</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.socialButton}>
        <FontAwesome name="phone" size={20} color="black" />
        <Text style={styles.socialText}>Continue with Phone Number</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.socialButton}>
        <FontAwesome name="facebook" size={20} color="black" />
        <Text style={styles.socialText}>Continue with Facebook</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => router.push('/auth/sign-up')} disabled={loading}>
        <Text style={styles.signUpText}>
          Don't have an account? <Text style={styles.signUpLink}>Sign Up</Text>
        </Text>
      </TouchableOpacity>
      
      {/* Toast Notification */}
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "gray",
    marginBottom: 20,
  },
  label: {
    alignSelf: "flex-start",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
  },
  input: {
    width: "100%",
    padding: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginTop: 5,
  },
  passwordContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginTop: 5,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
  },
  icon: {
    padding: 10,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    color: "blue",
    marginVertical: 10,
  },
  signInButton: {
    width: "100%",
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 10,
  },
  signInText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  orText: {
    marginVertical: 10,
    color: "gray",
    textAlign: "center",
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginVertical: 5,
  },
  socialText: {
    marginLeft: 10,
    fontSize: 16,
  },
  signUpText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: "center",
  },
  signUpLink: {
    color: "blue",
    fontWeight: "bold",
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 5,
    alignSelf: "flex-start",
  },
  loadingContainer: { 
    alignItems: 'center', 
    marginVertical: 10 
  },
  loadingText: { 
    marginTop: 10, 
    color: '#555' 
  },
});