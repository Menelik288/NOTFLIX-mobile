import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, StatusBar, Dimensions, Platform, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { fetchTrending, fetchPopular, fetchTopRated, fetchNowPlaying, fetchTopRatedTV, getImageUrl } from '../../lib/tmdb';
import { AutoScrollingRail } from '../../components/AutoScrollingRail';

const { width, height } = Dimensions.get('window');

const PROFILE_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDf_Iy4CwUUmG4ph51kXisz1Wymgy7Wn7PZSmo5QzGuhV3E1q8i76u9Jjg_6FMNgSaXT4KOTxgqWjNAWHf8gu9De1P6Ti68RlXAq3OnA_ReydjoX3x_RQ2RCsYnPQmEztFTBowE15WV9KonZayQgK-EohG20i23uRK48tVFUafjsTzadVl-DH7wKw1DtKsIn5XmDFYzQ8mRDC4XVMnbWFgkpoULfNUFPTOdm3f4q0VJ6afncz_sAE14gMC4pE1UIy5k0UQ5e9BNW0lO';

import { HomeSkeleton } from '../../components/SkeletonLoader';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { User } from '@supabase/supabase-js';
import { useToast } from '../../components/Toast';
import { toggleWatchlist, checkInWatchlist, fetchContinueWatching } from '../../lib/database';
import { ContinueWatchingRail } from '../../components/ContinueWatchingRail';

export default function HomeScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const { isLightMode } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [popular, setPopular] = useState<any[]>([]);
  const [topRated, setTopRated] = useState<any[]>([]);
  const [nowPlaying, setNowPlaying] = useState<any[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<any[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);

  const heroTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user && trending.length > 0) {
      const heroMovie = trending[heroIndex];
      checkInWatchlist(heroMovie.id, heroMovie.media_type || 'movie').then(setIsInWatchlist);
    }
  }, [heroIndex, user, trending]);

  const [error, setError] = useState(false);

  useEffect(() => {
    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Initial load of TMDB data - runs only once
    const loadTMDBData = async () => {
      setError(false);
      try {
        const [trendingData, popularData, topRatedData, nowPlayingData, topRatedTVData] = await Promise.all([
          fetchTrending(),
          fetchPopular(),
          fetchTopRated(),
          fetchNowPlaying(),
          fetchTopRatedTV(),
        ]);
        
        setTrending(trendingData.results || []);
        setPopular(popularData.results || []);
        setTopRated(topRatedData.results || []);
        setNowPlaying(nowPlayingData.results || []);
        setTopRatedTV(topRatedTVData.results || []);
      } catch (e) {
        console.warn("Failed to fetch TMDB data (network):", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadTMDBData();

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user-specific data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchContinueWatching()
          .then(data => setContinueWatching(data || []))
          .catch(e => console.warn("Failed to fetch user data (network):", e));
      } else {
        setContinueWatching([]);
      }
    }, [user])
  );

  useEffect(() => {
    if (trending.length > 0) {
      heroTimer.current = setInterval(() => {
        setHeroIndex(prev => (prev + 1) % Math.min(trending.length, 5));
      }, 20000);
    }
    return () => {
      if (heroTimer.current) clearInterval(heroTimer.current);
    };
  }, [trending]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const [trendingData, popularData, topRatedData, nowPlayingData, topRatedTVData] = await Promise.all([
        fetchTrending(),
        fetchPopular(),
        fetchTopRated(),
        fetchNowPlaying(),
        fetchTopRatedTV(),
      ]);
      
      setTrending(trendingData.results || []);
      setPopular(popularData.results || []);
      setTopRated(topRatedData.results || []);
      setNowPlaying(nowPlayingData.results || []);
      setTopRatedTV(topRatedTVData.results || []);

      if (user) {
        try {
          const cwData = await fetchContinueWatching();
          setContinueWatching(cwData || []);
        } catch (e) {
          // Silent fail for user data refresh
        }
      }
    } catch (e) {
      console.warn("Refresh encountered an issue (likely network):", e);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  if (loading) {
    return <HomeSkeleton />;
  }

  if (error && trending.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 40 }]}>
        <MaterialIcons name="error-outline" size={80} color="#E50914" />
        <Text style={{ color: 'white', fontSize: 24, fontWeight: '800', marginTop: 24, textAlign: 'center' }}>Service Unavailable</Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginTop: 12, textAlign: 'center' }}>
          TMDB is currently experiencing issues (502 Bad Gateway). Please try again in a moment.
        </Text>
        <TouchableOpacity 
          style={{ backgroundColor: '#E50914', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30, marginTop: 32 }}
          onPress={() => onRefresh()}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Retry Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const heroMovie = trending[heroIndex];

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
          <Text style={[styles.logoText, isLightMode && { color: '#000' }]}>NOTFLIX</Text>
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
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {
              console.log('User triggered pull-to-refresh');
              onRefresh();
            }} 
            tintColor="#E50914"
            colors={["#E50914"]}
            progressBackgroundColor="#1A1A1A"
          />
        }
      >
        {/* Immersive Hero Banner */}
        {heroMovie && (
          <View style={styles.heroSection}>
            <Image 
              key={heroMovie.id}
              source={{ uri: getImageUrl(heroMovie.poster_path, 'original') }} 
              style={styles.heroImg} 
            />
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
                <View style={styles.trendingBadge}>
                  <Text style={styles.trendingBadgeText}>TRENDING NOW</Text>
                </View>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {heroMovie.title || heroMovie.name}
                </Text>
                <Text style={styles.heroDesc} numberOfLines={2}>
                  {heroMovie.overview}
                </Text>
                <View style={styles.heroActions}>
                  <TouchableOpacity 
                    style={styles.playButton} 
                    onPress={() => router.push({ pathname: '/movie', params: { id: heroMovie.id, type: heroMovie.media_type || 'movie' } })}
                  >
                    <MaterialIcons name="play-arrow" size={24} color="white" />
                    <Text style={styles.playButtonText}>Watch Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.addButton, isInWatchlist && styles.activeAddButton]}
                    onPress={async () => {
                      if (user) {
                        try {
                          const heroMovie = trending[heroIndex];
                          const { action } = await toggleWatchlist({
                            media_id: heroMovie.id,
                            media_type: heroMovie.media_type || 'movie',
                            poster_path: heroMovie.poster_path,
                            title: heroMovie.title || heroMovie.name
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
                    <Text style={[styles.addButtonText, isInWatchlist && { color: '#E50914' }]}>
                      {isInWatchlist ? 'Added' : 'My List'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          </View>
        )}

        {/* Content Rails */}
        <View style={styles.railsContainer}>
          
          {/* Continue Watching (Real Data) */}
          <ContinueWatchingRail data={continueWatching} />

          {/* Trending This Week */}
          <AutoScrollingRail title="Trending Movies This Week" data={trending} type="movie" />

          {/* Top Rated Movies */}
          <AutoScrollingRail title="Top Rated Movies" data={topRated} type="movie" />

          {/* Top Rated TV Series */}
          <AutoScrollingRail title="Top Rated TV Series" data={topRatedTV} type="tv" />

          {/* Now Playing / Latest */}
          <AutoScrollingRail title="Now Playing / Latest" data={nowPlaying} type="movie" />

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
    minHeight: height,
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
    color: '#E50914',
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
  headerIconBtn: {
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
    height: height * 0.75,
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
  trendingBadge: {
    backgroundColor: '#E50914',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 12,
  },
  trendingBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.7)',
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
    elevation: 8,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  playButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  addButton: {
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
  activeAddButton: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    borderColor: '#E50914',
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  railsContainer: {
    marginTop: 20,
    gap: 32,
    paddingBottom: 20,
  },
  rail: {},
  railTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 12,
    paddingHorizontal: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  railScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 20,
  },
  verticalCard: {
    width: 120,
    aspectRatio: 2 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  verticalCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});
