import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, StatusBar, Dimensions, Alert, Platform, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { getImageUrl } from '../lib/tmdb';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from '../lib/database';

const { width, height } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setDisplayName(currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || '');
        setAvatarUrl(currentUser.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (currentUser.email || 'Felix'));
      }
    });
  }, []);

  const handlePickImage = async () => {
    if (!isEditing) setIsEditing(true);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setAvatarUrl(base64Image);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Invalid Name', 'Display name cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(user!.id, displayName.trim(), avatarUrl);
      
      // Update local state
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.warn(error);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setIsSaving(false);
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
              await supabase.auth.signOut();
              // Force clear storage for physical devices
              const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
              await AsyncStorage.removeItem('supabase.auth.token');
              router.replace('/(tabs)');
            } catch (error) {
              router.replace('/(tabs)');
            }
          }
        }
      ]
    );
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <LinearGradient
          colors={['#4A0009', '#1A0003', '#0A0A0A']}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <BlurView tint="dark" intensity={20} style={StyleSheet.absoluteFillObject} />

        {/* Close button */}
        <TouchableOpacity
          style={[styles.backBtn, { marginTop: insets.top + 10 }]}
          onPress={() => router.back()}
        >
          <BlurView 
            tint="light" 
            intensity={Platform.OS === 'android' ? 60 : 20} 
            style={[
              StyleSheet.absoluteFill,
              Platform.OS === 'android' && { backgroundColor: 'rgba(255,255,255,0.4)' }
            ]} 
          />
          <MaterialIcons name="close" size={22} color="white" />
        </TouchableOpacity>

        {/* Avatar */}
        <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage} activeOpacity={0.8}>
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
          />
          <View style={styles.editAvatarBtn}>
            <MaterialIcons name="edit" size={14} color="white" />
          </View>
        </TouchableOpacity>

        {isEditing ? (
          <TextInput
            style={styles.nameInput}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter display name"
            placeholderTextColor="rgba(255,255,255,0.5)"
            autoCapitalize="words"
            autoCorrect={false}
          />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.username}>{displayName}</Text>
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <MaterialIcons name="edit" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>
        )}

        {isEditing ? (
          <TouchableOpacity 
            style={styles.saveBtn} 
            onPress={handleSaveProfile}
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        ) : (
          <Text style={styles.email}>{user.email}</Text>
        )}

        {/* Premium badge */}
        <View style={[styles.premiumBadge, { marginTop: isEditing ? 12 : 24 }]}>
          <BlurView 
            tint="light" 
            intensity={Platform.OS === 'android' ? 40 : 10} 
            style={[
              StyleSheet.absoluteFill,
              Platform.OS === 'android' && { backgroundColor: 'rgba(255,255,255,0.2)' }
            ]} 
          />
          <MaterialIcons name="star" size={12} color="#FFD700" />
          <Text style={styles.premiumText}>NOTFLIX PREMIUM</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Menu */}
        <View style={styles.menuSection}>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/watchlist')}>
            <BlurView 
              tint="light" 
              intensity={Platform.OS === 'android' ? 40 : 8} 
              style={[
                StyleSheet.absoluteFill,
                Platform.OS === 'android' && { backgroundColor: 'rgba(255,255,255,0.15)' }
              ]} 
            />
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(229, 9, 20, 0.15)' }]}>
              <MaterialIcons name="bookmark" size={22} color="#E50914" />
            </View>
            <Text style={styles.menuText}>My Watchlist</Text>
            <MaterialIcons name="chevron-right" size={22} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/downloads')}>
            <BlurView tint="light" intensity={8} style={StyleSheet.absoluteFill} />
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
              <MaterialIcons name="file-download" size={22} color="rgba(255,255,255,0.8)" />
            </View>
            <Text style={styles.menuText}>Downloads</Text>
            <MaterialIcons name="chevron-right" size={22} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings')}>
            <BlurView tint="light" intensity={8} style={StyleSheet.absoluteFill} />
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
              <MaterialIcons name="settings" size={22} color="rgba(255,255,255,0.8)" />
            </View>
            <Text style={styles.menuText}>App Settings</Text>
            <MaterialIcons name="chevron-right" size={22} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <BlurView tint="light" intensity={8} style={StyleSheet.absoluteFill} />
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
              <MaterialIcons name="help-outline" size={22} color="rgba(255,255,255,0.8)" />
            </View>
            <Text style={styles.menuText}>Help Center</Text>
            <MaterialIcons name="chevron-right" size={22} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>



        <Text style={styles.versionText}>NotFlix v2.0.0 · Premium</Text>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  heroBanner: {
    height: height * 0.42,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    top: 0,
    left: 20,
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: '#1A1A1A',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A0A0A',
  },
  username: {
    color: 'white',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  email: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginBottom: 16,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  premiumText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  nameInput: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 16,
    width: '80%',
  },
  saveBtn: {
    backgroundColor: '#E50914',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
    minWidth: 140,
    alignItems: 'center',
  },
  saveBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
    gap: 10,
  },
  menuSection: {
    gap: 10,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  versionText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  downloadsContainer: {
    height: height * 0.8,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sheetHeader: {
    paddingTop: 12,
    paddingBottom: 20,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginBottom: 20,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  sheetCloseBtn: {
    position: 'absolute',
    right: 20,
    top: 35,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadList: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  downloadCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    gap: 16,
    alignItems: 'center',
  },
  downloadPoster: {
    width: 60,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
  },
  downloadInfo: {
    flex: 1,
    gap: 4,
  },
  downloadTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  downloadMeta: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E50914',
    borderRadius: 2,
  },
  progressText: {
    color: '#E50914',
    fontSize: 11,
    fontWeight: '800',
  },
  playOfflineBtn: {
    backgroundColor: 'rgba(229,9,20,0.1)',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.3)',
  },
  playOfflineText: {
    color: '#E50914',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 8,
  },
  emptyDownloads: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
  },
  downloadBadge: {
    backgroundColor: '#E50914',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  downloadBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
});
