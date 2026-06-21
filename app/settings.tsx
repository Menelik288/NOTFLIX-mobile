import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Switch, Modal, TextInput, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const SETTINGS_OPTIONS = [
  { id: 'notifications', title: 'Notifications', desc: 'Manage alerts and updates', icon: 'notifications' as const },
  { id: 'accounts', title: 'Accounts', desc: 'Edit profile and account details', icon: 'person' as const },
  { id: 'history', title: 'History', desc: 'View or manage watch history', icon: 'history' as const },
  { id: 'theme', title: 'Light Mode', desc: 'Switch between dark and light appearance', icon: 'light-mode' as const },
  { id: 'biometrics', title: 'Biometrics', desc: 'Secure the app with fingerprint or face unlock', icon: 'fingerprint' as const },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLightMode, toggleTheme } = useTheme();

  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedVal = await AsyncStorage.getItem('isBiometricsEnabled');
        if (storedVal !== null) {
          setIsBiometricsEnabled(storedVal === 'true');
        }
      } catch (e) {
        console.warn('Failed to load settings', e);
      }
    };
    loadSettings();
  }, []);

  const toggleBiometrics = async (value: boolean) => {
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Not Available', 'Biometric authentication is not set up on this device.');
        return;
      }

      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to enable App Lock',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        });

        if (result.success) {
          setIsBiometricsEnabled(true);
          await AsyncStorage.setItem('isBiometricsEnabled', 'true');
        } else {
          setIsBiometricsEnabled(false);
        }
      } catch (e) {
        console.warn(e);
        Alert.alert('Error', 'Failed to enable biometrics.');
      }
    } else {
      setIsBiometricsEnabled(false);
      await AsyncStorage.setItem('isBiometricsEnabled', 'false');
    }
  };
  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of NotFlix?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Wipe everything first (The Nuke)
              await AsyncStorage.clear();
              
              // 2. Tell Supabase to sign out (with global scope)
              await supabase.auth.signOut({ scope: 'global' });
              
              // 3. Destroy memory references
              try {
                (supabase.auth as any).session = null;
                (supabase.auth as any).user = null;
              } catch (e) {}

              // 4. Tiny delay to let Android catch up
              await new Promise(resolve => setTimeout(resolve, 800));
              
              router.replace('/auth');
            } catch (error) {
              console.warn('Sign out error:', error);
              router.replace('/auth');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={isLightMode ? ['#F5F5F7', '#E5E5EA', '#D1D1D6'] : ['#0A0A0A', '#1A1A1A', '#0f0f0f']}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <BlurView 
            tint={isLightMode ? "dark" : "light"} 
            intensity={Platform.OS === 'android' ? 60 : 20} 
            style={[
              StyleSheet.absoluteFill,
              Platform.OS === 'android' && { 
                backgroundColor: isLightMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.3)' 
              }
            ]} 
          />
          <MaterialIcons name="arrow-back-ios" size={18} color={isLightMode ? "#FFF" : "white"} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isLightMode && { color: '#000' }]}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <Text style={[styles.introText, isLightMode && { color: '#333' }]}>Customize your NotFlix experience</Text>
        </View>

        <View style={styles.optionsContainer}>
          {SETTINGS_OPTIONS.map((option, index) => (
            <TouchableOpacity 
              key={option.id} 
              style={styles.optionCard} 
              activeOpacity={0.7}
              onPress={() => {
                if (option.id === 'history') {
                  router.push('/history');
                } else if (option.id === 'accounts') {
                  setShowAccountModal(true);
                }
              }}
            >
              <BlurView 
                tint={isLightMode ? "dark" : "light"} 
                intensity={Platform.OS === 'android' ? 50 : 15} 
                style={[
                  StyleSheet.absoluteFill,
                  Platform.OS === 'android' && { 
                    backgroundColor: isLightMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.2)' 
                  }
                ]} 
              />
              <View style={[styles.iconContainer, isLightMode && { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                <MaterialIcons name={option.icon} size={22} color={isLightMode ? "#000" : "rgba(255,255,255,0.9)"} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.optionTitle, isLightMode && { color: '#000' }]}>{option.title}</Text>
                <Text style={[styles.optionDesc, isLightMode && { color: '#666' }]}>{option.desc}</Text>
              </View>
              {option.id === 'theme' ? (
                <Switch 
                  value={isLightMode} 
                  onValueChange={toggleTheme} 
                  trackColor={{ false: '#333', true: '#E50914' }}
                />
              ) : option.id === 'biometrics' ? (
                <Switch 
                  value={isBiometricsEnabled} 
                  onValueChange={toggleBiometrics} 
                  trackColor={{ false: '#333', true: '#E50914' }}
                />
              ) : (
                <MaterialIcons name="chevron-right" size={24} color={isLightMode ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)"} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <BlurView 
            tint={isLightMode ? "dark" : "light"} 
            intensity={Platform.OS === 'android' ? 50 : 15} 
            style={[
              StyleSheet.absoluteFill,
              Platform.OS === 'android' && { 
                backgroundColor: isLightMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.2)' 
              }
            ]} 
          />
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(229, 9, 20, 0.15)' }]}>
            <MaterialIcons name="logout" size={22} color="#E50914" />
          </View>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, isLightMode && { color: '#999' }]}>Version 4.12.0 (Build 2024)</Text>
      </ScrollView>

      {/* Account Modal */}
      <Modal visible={showAccountModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowAccountModal(false)} />
          <BlurView 
            tint={isLightMode ? "light" : "dark"} 
            intensity={Platform.OS === 'android' ? 90 : 30} 
            style={[styles.modalContent, Platform.OS === 'android' && { backgroundColor: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(20,20,20,0.95)' }]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.sheetHandle} />
              <Text style={[styles.modalTitle, isLightMode && { color: 'black' }]}>Account Settings</Text>
            </View>

            <View style={styles.accountOptions}>
              <TouchableOpacity style={styles.accountOptionBtn} onPress={() => { setShowAccountModal(false); router.push('/profile'); }}>
                <View style={[styles.optionIconContainer, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
                  <MaterialIcons name="edit" size={22} color="#34C759" />
                </View>
                <Text style={[styles.accountOptionText, isLightMode && { color: 'black' }]}>Edit Profile Identity</Text>
                <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.accountOptionBtn} onPress={handleLogout}>
                <View style={[styles.optionIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
                  <MaterialIcons name="logout" size={22} color="#FF9500" />
                </View>
                <Text style={[styles.accountOptionText, isLightMode && { color: 'black' }]}>Sign Out</Text>
                <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowAccountModal(false)}>
              <Text style={[styles.closeModalText, isLightMode && { color: '#000' }]}>Close</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>


    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Audiowide',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  introSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  introText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  optionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.3)',
    marginTop: 8,
  },
  logoutText: {
    color: '#E50914',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 16,
    flex: 1,
  },
  versionText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 40,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 20,
    minHeight: 400,
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Audiowide',
  },
  accountOptions: {
    gap: 8,
    marginTop: 20,
  },
  accountOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  accountOptionText: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 12,
  },
  closeModalBtn: {
    marginTop: 24,
    padding: 16,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  closeModalText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  passwordModalContent: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  passwordModalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  passwordInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  passwordModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  passwordCancelBtn: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  passwordCancelText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordSaveBtn: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#E50914',
  },
  passwordSaveText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
