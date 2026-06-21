import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, StatusBar, Dimensions, ActivityIndicator, Alert, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { fetchTrendingTV, fetchPopularTV, fetchByGenre, getImageUrl } from '../../lib/tmdb';
import { getPersonalizedRecommendations } from '../../lib/recommendations';
import { fetchWatchlist, fetchContinueWatching, fetchHistory } from '../../lib/database';
import { AutoScrollingRail } from '../../components/AutoScrollingRail';

const { width, height } = Dimensions.get('window');

const PROFILE_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDF0g112eHDEQvJjR2hH2eUOfL01-2DqK6k_uB8mC22qJ0fK3A3j3T_M7hW-K_B8P9TqD2tJt9xPj5QfA5z0W7j-5t1oN0iWpWb2G1f5-1E2tD3j5_R1R6U7k2R1d7o8C5vK1C9A1K4uT1g2H3V9O7C8L1D1S2v2H3D9qT8H2mD7zP4lO9e8zH5X6D8K9O2M5T8Y8C5W5Z3K8M2W6Y5M7L8D2J5G5D2Y8J1H1T1V6M5T8D';

import { HomeSkeleton } from '../../components/SkeletonLoader';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { User } from '@supabase/supabase-js';
import { useToast } from '../../components/Toast';
import { toggleWatchlist, checkInWatchlist } from '../../lib/database';

export default function TVScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const { isLightMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [trendingTV, setTrendingTV] = useState<any[]>([]);
  const [actionTV, setActionTV] = useState<any[]>([]);
  const [popularTV, setPopularTV] = useState<any[]>([]);
  const [personalizedTV, setPersonalizedTV] = useState<any[]>([]);
  const [recReason, setRecReason] = useState("");

  const heroTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user && trendingTV.length > 0) {
      const heroMovie = trendingTV[heroIndex];
      checkInWatchlist(heroMovie.id, 'tv').then(setIsInWatchlist);
    }
  }, [heroIndex, user, trendingTV]);

  useEffect(() => {
    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    const loadData = async () => {
      try {
        const [trendingData, actionData, popularData] = await Promise.all([
          fetchTrendingTV(),
          fetchByGenre('tv', 10759), // Action & Adventure TV
          fetchPopularTV()
        ]);
        
        setTrendingTV(trendingData.results || []);
        setActionTV(actionData.results || []);
        setPopularTV(popularData.results || []);

        if (user) {
          const [watchlist, continueWatching, watchHistory] = await Promise.all([
            fetchWatchlist(),
            fetchContinueWatching(),
            fetchHistory()
          ]);
          
          const personalized = await getPersonalizedRecommendations(watchlist, continueWatching, watchHistory);
          setPersonalizedTV(personalized.tv);
          setRecReason(personalized.reason);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const [trendingData, actionData, popularData] = await Promise.all([
        fetchTrendingTV(),
        fetchByGenre('tv', 10759),
        fetchPopularTV()
      ]);
      setTrendingTV(trendingData.results || []);
      setActionTV(actionData.results || []);
      setPopularTV(popularData.results || []);

      if (user) {
        const [watchlist, continueWatching, watchHistory] = await Promise.all([
          fetchWatchlist(),
          fetchContinueWatching(),
          fetchHistory()
        ]);
        const personalized = await getPersonalizedRecommendations(watchlist, continueWatching, watchHistory);
        setPersonalizedTV(personalized.tv);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (trendingTV.length > 0) {
      heroTimer.current = setInterval(() => {
        setHeroIndex(prev => (prev + 1) % Math.min(trendingTV.length, 10));
      }, 20000);
    }
    return () => {
      if (heroTimer.current) clearInterval(heroTimer.current);
    };
  }, [trendingTV]);

  const heroTV = trendingTV[heroIndex];

  if (loading) {
    return <HomeSkeleton />;
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
          <Text style={[styles.logoText, isLightMode && { color: '#000' }]}>TV SHOWS</Text>
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
        
        {heroTV && (
          <View style={styles.heroSection}>
            <Image source={{ uri: getImageUrl(heroTV.poster_path, 'original') }} style={styles.heroImg} />
            <LinearGradient
              colors={[
                'transparent',
                isLightMode ? 'rgba(245,245,247,0.3)' : 'rgba(10,10,10,0.3)',
                isLightMode ? 'rgba(245,245,247,0.7)' : 'rgba(10,10,10,0.7)',
                isLightMode ? '#F5F5F7' : '#0A0A0A'
              ]}
              locations={[0, 0.3, 0.6, 1]}
              style={styles.heroGradientBottom}
            />
            <View style={styles.heroContentWrapper}>
              <BlurView tint="dark" intensity={40} style={styles.heroGlassPanel}>
                <View style={styles.originalBadge}>
                  <Text style={styles.originalBadgeText}>TRENDING TV</Text>
                </View>
                <Text style={styles.heroTitle} numberOfLines={1}>{heroTV.name}</Text>
                <Text style={styles.heroDesc} numberOfLines={2}>
                  {heroTV.overview}
                </Text>
                
                <View style={styles.heroActions}>
                  <TouchableOpacity style={styles.playButton} onPress={() => router.push({ pathname: '/movie', params: { id: heroTV.id, type: 'tv' } })}>
                    <MaterialIcons name="play-arrow" size={24} color="white" />
                    <Text style={styles.playButtonText}>WATCH NOW</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.listButton, isInWatchlist && styles.activeListButton]}
                    onPress={async () => {
                      if (user) {
                        try {
                          const heroTV = trendingTV[heroIndex];
                          const { action } = await toggleWatchlist({
                            media_id: heroTV.id,
                            media_type: 'tv',
                            poster_path: heroTV.poster_path,
                            title: heroTV.name
                          });
                          setIsInWatchlist(action === 'added');
                          showToast(
                            action === 'added' ? 'Added to My List' : 'Removed from My List',
                            'success'
                          );
                        } catch (e) {
                          showToast('Failed to update watchlist', 'error');
                        }
                      } else {
                        showToast('Sign in to save to My List', 'info');
                        router.push('/auth');
                      }
                    }}
                  >
                    <MaterialIcons name={isInWatchlist ? "check" : "add"} size={22} color={isInWatchlist ? "#E50914" : "white"} />
                    <Text style={[styles.listButtonText, isInWatchlist && { color: '#E50914' }]}>
                      {isInWatchlist ? 'ADDED' : 'MY LIST'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          </View>
        )}

        <View style={styles.railsWrapper}>
          {personalizedTV.length > 0 && (
            <AutoScrollingRail title={`Picks: ${recReason}`} data={personalizedTV} type="tv" />
          )}
          <AutoScrollingRail title="Trending TV Now" data={trendingTV} type="tv" />
          <AutoScrollingRail title="Action & Adventure" data={actionTV} type="tv" />
          <AutoScrollingRail title="Popular Series" data={popularTV} type="tv" />
        </View>

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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
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
  heroSection: {
    width: '100%',
    height: height * 0.7,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
  },
  heroContentWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    zIndex: 10,
  },
  heroGlassPanel: {
    padding: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  originalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E50914',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 12,
  },
  originalBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 36,
    marginBottom: 8,
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E50914',
    height: 50,
    borderRadius: 12,
    gap: 8,
  },
  playButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  listButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 8,
  },
  activeListButton: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    borderColor: '#E50914',
  },
  listButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  railsWrapper: {
    marginTop: 20,
    gap: 32,
    paddingBottom: 20,
  },
});
