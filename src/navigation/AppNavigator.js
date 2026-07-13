import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { Home, Calendar, ScanFace, BarChart2, Settings } from 'lucide-react-native';
import VoiceVerifyScreen from '../screens/main/VoiceVerifyScreen';
import SettingsDetailScreen from '../screens/main/SettingsDetailScreen';
import DeviceConnectionScreen from '../screens/main/DeviceConnectionScreen';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import SlotSelectionScreen from '../screens/auth/SlotSelectionScreen';
import FaceEnrollScreen from '../screens/auth/FaceEnrollScreen';
import EnrollSuccessScreen from '../screens/auth/EnrollSuccessScreen';
import VoiceEnrollScreen from '../screens/auth/VoiceEnrollScreen';

// Main Screens
import HomeScreen from '../screens/main/HomeScreen';
import ScheduleScreen from '../screens/main/ScheduleScreen';
import VerifyScreen from '../screens/main/VerifyScreen';
import MonitorScreen from '../screens/main/MonitorScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import AlertsScreen from '../screens/main/AlertsScreen';
import AddMedicationScreen from '../screens/main/AddMedicationScreen';



const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#3B5BDB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === 'Home')
            return <Home size={22} color={color} />;
          if (route.name === 'Schedule')
            return <Calendar size={22} color={color} />;
          if (route.name === 'Verify')
            return (
              <View style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: focused ? '#3B5BDB' : '#EEF2FF',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                shadowColor: '#3B5BDB',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}>
                <ScanFace size={26} color={focused ? '#FFFFFF' : '#3B5BDB'} />
              </View>
            );
          if (route.name === 'Monitor')
            return <BarChart2 size={22} color={color} />;
          if (route.name === 'Settings')
            return <Settings size={22} color={color} />;
        },
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Verify" component={VerifyScreen} />
      <Tab.Screen name="Monitor" component={MonitorScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="SlotSelection" component={SlotSelectionScreen} />
        <Stack.Screen name="FaceEnroll" component={FaceEnrollScreen} />
        <Stack.Screen name="EnrollSuccess" component={EnrollSuccessScreen} />
        <Stack.Screen name="MainApp" component={MainTabs} />
        <Stack.Screen name="Alerts" component={AlertsScreen} />
        <Stack.Screen name="VoiceVerify" component={VoiceVerifyScreen} />
        <Stack.Screen name="SettingsDetail" component={SettingsDetailScreen} />
        <Stack.Screen name="DeviceConnection" component={DeviceConnectionScreen} />
        <Stack.Screen name="AddMedication" component={AddMedicationScreen} />
        <Stack.Screen name="VoiceEnroll" component={VoiceEnrollScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;