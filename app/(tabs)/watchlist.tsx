import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, StatusBar, Dimensions, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { fetchWatchlist, toggleWatchlist } from '../../lib/database';
import { User } from '@supabase/supabase-js';
import { getImageUrl } from '../../lib/tmdb';
import { GridSkeleton } from '../../components/SkeletonLoader';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

const PROFILE_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsOiXHy2u2FANO2OeQGBCfvebLXzBYk__e5MH-8yaUwCnyOarQZu9o_50CNLVK737vEZoy5kXk0DVueW7qeqhOHTdq8Q_EJse78NoDienFLeN_QvHjmRYHJBDEQnelXDUad4t23a0Tvq02J3TWh6qb0BGxLH_Au3CDbMsFnlW7_oRStqc3EurBXmRpYg8ZB56O-9CSovEiI_uAcwZewsRsQxVUfYXvc_PEMKsFoUig0zM_JH90S3iW9d73bGAwfyZ-NsqDhMK8ROKL';

export default function WatchlistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isLightMode } = useTheme();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadWatchlist = async () => {
    if (!user) return;
    try {
      const data = await fetchWatchlist();
      setWatchlist(data || []);
    } catch (e) {
      console.warn('Watchlist fetch issue:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadWatchlist();
      } else {
        setLoading(false);
      }
    }, [user])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWatchlist();
  }, [user]);

  const handleRemove = async (item: any) => {
    if (!user) return;
    try {
      await toggleWatchlist({
        media_id: item.media_id,
        media_type: item.media_type,
        poster_path: item.poster_path,
        title: item.title
      });
      setWatchlist(prev => prev.filter(i => i.id !== item.id));
    } catch (e) {
      console.warn(e);
    }
  };

  if (!user && !loading) {
    return (
      <View style={[styles.container, isLightMode && { backgroundColor: '#F5F5F7' }]}>
        <StatusBar barStyle={isLightMode ? "dark-content" : "light-content"} translucent />
        <View style={styles.emptyContainer}>
          <BlurView tint={isLightMode ? "light" : "dark"} intensity={isLightMode ? 40 : 60} style={StyleSheet.absoluteFill} />
          <MaterialIcons name="lock-outline" size={80} color="#E50914" />
          <Text style={[styles.emptyTitle, isLightMode && { color: 'black' }]}>Members Only</Text>
          <Text style={[styles.emptySubtitle, isLightMode && { color: 'rgba(0,0,0,0.6)' }]}>Join NotFlix to save your favorite movies and shows to your personal watchlist.</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth')}>
            <Text style={styles.loginBtnText}>Sign In / Join Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)')}>
            <Text style={styles.browseBtnText}>Continue Browsing</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isLightMode && { backgroundColor: '#F5F5F7' }]}>
      <StatusBar barStyle={isLightMode ? "dark-content" : "light-content"} translucent backgroundColor="transparent" />

      {/* Cinematic Custom Glass Header */}
      <View style={[styles.header, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <BlurView 
          tint={isLightMode ? "light" : "dark"} 
          intensity={Platform.OS === 'android' ? 90 : (isLightMode ? 40 : 20)} 
          style={[
            StyleSheet.absoluteFill, 
            Platform.OS === 'android' && { 
              backgroundColor: isLightMode ? 'rgba(255,255,255,0.85)' : 'rgba(15,15,15,0.8)' 
            }
          ]} 
        />
        <View style={styles.headerContent}>
          <Text style={[styles.logoText, isLightMode && { color: '#000' }]}>WATCHLIST</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/search')}>
              <MaterialIcons name="search" size={20} color={isLightMode ? "#000" : "white"} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileBtn} 
              onPress={() => user ? router.push('/profile') : router.push('/auth')}
            >
              <Image 
                source={user?.user_metadata?.avatar_url ? { uri: user.user_metadata.avatar_url } : require('../../Icons/images.png')} 
                style={styles.profileImg} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E50914" />
        }
      >
        
        <View style={[styles.titleSection, { paddingTop: insets.top + 74 }]}>
          <Text style={[styles.pageTitle, isLightMode && { color: '#000' }]}>My Watchlist</Text>
          <Text style={[styles.pageSubtitle, isLightMode && { color: '#666' }]}>
            {watchlist.length} {watchlist.length === 1 ? 'item' : 'items'} saved for later
          </Text>
        </View>

        {loading ? (
          <GridSkeleton />
        ) : watchlist.length === 0 ? (
          <View style={styles.noItemsContainer}>
            <MaterialIcons name="bookmark-border" size={60} color={isLightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)"} />
            <Text style={[styles.noItemsText, isLightMode && { color: 'rgba(0,0,0,0.5)' }]}>Your watchlist is empty</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(tabs)')}>
              <Text style={styles.addBtnText}>Discover Movies</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {watchlist.map((item) => (
              <View key={item.id} style={styles.gridItem}>
                <TouchableOpacity 
                  activeOpacity={0.8} 
                  onPress={() => router.push({ pathname: '/movie', params: { id: item.media_id, type: item.media_type } })}
                >
                  <View style={styles.cardImageContainer}>
                    <Image source={{ uri: getImageUrl(item.poster_path) }} style={styles.cardImage} />
                    <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item)}>
                      <BlurView tint="dark" intensity={60} style={StyleSheet.absoluteFill} />
                      <MaterialIcons name="close" size={14} color="white" />
                    </TouchableOpacity>
                    <View style={styles.typeBadge}>
                      <BlurView tint="dark" intensity={30} style={StyleSheet.absoluteFill} />
                      <Text style={styles.typeBadgeText}>{item.media_type.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.cardDetails}>
                    <Text style={styles.movieTitle} numberOfLines={1}>{item.title}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    paddingBottom: 100,
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
  logoText: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Audiowide',
    letterSpacing: 1,
    paddingTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
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
  profileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  profileImg: {
    width: '100%',
    height: '100%',
  },
  titleSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  pageSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
  gridContainer: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: isTablet ? '25%' : '50%',
    padding: 8,
    marginBottom: 12,
  },
  cardImageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 10,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  typeBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(229, 9, 20, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardDetails: {
    paddingHorizontal: 4,
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
    overflow: 'hidden',
  },
  emptyTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 16,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
  loginBtn: {
    backgroundColor: '#E50914',
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 8,
  },
  loginBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  browseBtn: {
    paddingVertical: 12,
  },
  browseBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '700',
  },
  noItemsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 20,
  },
  noItemsText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 18,
    fontWeight: '700',
  },
  addBtn: {
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  }
});
