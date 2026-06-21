import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts, Audiowide_400Regular } from '@expo-google-fonts/audiowide';
import 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

SplashScreen.preventAutoHideAsync();

// Global Network Error Silencer
if (__DEV__) {
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.warn = (...args) => {
    const msg = args[0]?.toString() || '';
    if (msg.includes('Network request failed') || 
        msg.includes('fetch user data') ||
        msg.includes('Watchlist fetch issue') ||
        msg.includes('Personalized load')) {
      return;
    }
    originalWarn(...args);
  };

  console.error = (...args) => {
    const msg = args[0]?.toString() || '';
    if (!msg || msg.includes('Network request failed') || msg.includes('fetch user data')) {
      return; 
    }
    originalError(...args);
  };
}

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

import { ToastProvider } from '../components/Toast';
import { ThemeProvider as AppThemeProvider } from '../context/ThemeContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    Audiowide: Audiowide_400Regular,
  });

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState(true);

  const authenticate = async () => {
    try {
      const storedVal = await AsyncStorage.getItem('isBiometricsEnabled');
      if (storedVal === 'true') {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock NotFlix',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        });
        
        if (result.success) {
          setIsUnlocked(true);
        } else {
          setIsUnlocked(false);
        }
      } else {
        setIsUnlocked(true);
      }
    } catch (e) {
      console.warn(e);
      setIsUnlocked(true); // Fail open if error reading storage
    } finally {
      setIsCheckingBiometrics(false);
    }
  };

  useEffect(() => {
    authenticate();
  }, []);

  useEffect(() => {
    const hideSplash = async () => {
      if (loaded || error) {
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          // Ignore splash screen state issues
        }
      }
    };
    hideSplash();
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  if (isCheckingBiometrics) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A' }} />
    );
  }

  if (!isUnlocked) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <MaterialIcons name="lock-outline" size={80} color="#E50914" />
        <Text style={{ color: 'white', fontSize: 24, fontWeight: '800', marginTop: 20, marginBottom: 10, fontFamily: 'Audiowide' }}>NOTFLIX LOCKED</Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 40 }}>App lock is enabled. Please authenticate to continue watching.</Text>
        <TouchableOpacity 
          onPress={authenticate}
          style={{ backgroundColor: '#E50914', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <MaterialIcons name="fingerprint" size={24} color="white" />
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Unlock</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <AppThemeProvider>
      <ToastProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="movie" />
            <Stack.Screen name="search" />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="auth" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </ToastProvider>
    </AppThemeProvider>
  );
}
