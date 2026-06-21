import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  image: {
    width: width * 0.8,
    height: width * 0.6,
    marginBottom: 40,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#E50914',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default function DownloadsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLightMode } = useTheme();

  return (
    <View style={[styles.container, isLightMode && { backgroundColor: '#F5F5F7' }]}>
      <View style={[
        styles.header, 
        { paddingTop: insets.top, height: 44 + insets.top, backgroundColor: 'transparent', elevation: 0, zIndex: 100 }
      ]}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <BlurView 
              tint="dark" 
              intensity={Platform.OS === 'android' ? 60 : 30} 
              style={[
                StyleSheet.absoluteFill,
                Platform.OS === 'android' && { backgroundColor: 'rgba(20,20,20,0.85)' }
              ]} 
            />
            <MaterialIcons name="arrow-back-ios" size={18} color="white" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isLightMode && { color: '#000' }]}>Downloads</Text>
          {/* Placeholder to balance header */}
          <View style={{ width: 34 }} />
        </View>
      </View>

      <View style={styles.content}>
        <Image 
          source={require('../assets/images/Website_Under_Construction.webp')} 
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={[styles.title, isLightMode && { color: '#000' }]}>Under Construction</Text>
        <Text style={[styles.subtitle, isLightMode && { color: '#666' }]}>
          We're working hard to bring this feature back. It will be available in a future update!
        </Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
