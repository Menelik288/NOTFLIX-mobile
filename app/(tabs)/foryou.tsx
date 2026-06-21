import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { User } from '@supabase/supabase-js';

import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { fetchWatchlist, fetchContinueWatching, fetchHistory } from '../../lib/database';
import { fetchTrending, fetchTrendingTV, getImageUrl } from '../../lib/tmdb';
import { getPersonalizedRecommendations } from '../../lib/recommendations';
import { ContinueWatchingRail } from '../../components/ContinueWatchingRail';
import { HomeSkeleton } from '../../components/SkeletonLoader';

const { width, height } = Dimensions.get('window');

export default function ForYouScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLightMode } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const [heroItems, setHeroItems] = useState<any[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  
  const [movieRecs, setMovieRecs] = useState<any[]>([]);
  const [tvRecs, setTvRecs] = useState<any[]>([]);
  const [reason, setReason] = useState("✨ Top Pick");
  const [historyItems, setHistoryItems] = useState<any[]>([]);

  const loadPersonalizedContent = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      setUser(currentUser || null);

      if (currentUser) {
        // 1. Fetch user actual data from all sources
        const [watchlist, continueWatching, watchHistory] = await Promise.all([
          fetchWatchlist(),
          fetchContinueWatching(),
          fetchHistory()
        ]);

        const safeWatchlist = watchlist || [];
        const safeContinue = continueWatching || [];
        const safeHistory = watchHistory || [];

        setHistoryItems(safeContinue);

        // 2. Generate aggregate recommendations
        const personalized = await getPersonalizedRecommendations(
          safeWatchlist,
          safeContinue,
          safeHistory
        );

        setMovieRecs(personalized.movies);
        setTvRecs(personalized.tv);
        setReason(personalized.reason);
        
        // 3. Set hero items pool from the blended pool
        const allRecs = [...personalized.movies, ...personalized.tv];
        if (allRecs.length > 0) {
          // Select high-quality hero items (with backdrops if possible)
          const heroPool = allRecs
            .filter(item => item.backdrop_path && item.vote_average > 6)
            .sort(() => 0.5 - Math.random())
            .slice(0, 10);
          
          setHeroItems(heroPool.length > 0 ? heroPool : allRecs.slice(0, 5));
        } else {
          await loadFallback();
        }
      } else {
        await loadFallback();
      }
    } catch (e) {
      console.warn("Personalized load encountered a network issue:", e);
      try {
        await loadFallback();
      } catch (fallbackError) {
        // Even fallback failed, just let it be empty
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFallback = async () => {
    const [movies, tv] = await Promise.all([
      fetchTrending(),
      fetchTrendingTV()
    ]);
    
    setMovieRecs(movies.results.slice(0, 10));
    setTvRecs(tv.results.slice(0, 10));
    setHeroItems([...movies.results.slice(0, 3), ...tv.results.slice(0, 3)]);
  };

  useEffect(() => {
    if (heroItems.length === 0) return;
    const interval = setInterval(() => {
      setHeroIndex((prevIndex) => (prevIndex + 1) % heroItems.length);
    }, 20000);
    return () => clearInterval(interval);
  }, [heroItems]);

  useFocusEffect(
    useCallback(() => {
      loadPersonalizedContent();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadPersonalizedContent();
  };

  const navigateToDetails = (item: any) => {
    const type = item.media_type || (item.name ? 'tv' : 'movie');
    router.push({
      pathname: '/movie',
      params: { id: item.id, type }
    });
  };

  const heroItem = heroItems[heroIndex];

  if (loading) {
    return <HomeSkeleton />;
  }

  return (
    <View style={[styles.container, isLightMode && { backgroundColor: '#F5F5F7' }]}>
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
          <Text style={[styles.headerTitle, isLightMode && { color: '#000' }]}>For You</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/search')}>
              <MaterialIcons name="search" size={20} color={isLightMode ? "#000" : "white"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileBtn} onPress={() => user ? router.push('/profile') : router.push('/auth')}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E50914" />}
      >
        {/* Personalized Hero */}
        {heroItem && (
          <View style={styles.heroSection}>
            <Image 
              key={`hero-${heroItem.id}`}
              source={{ uri: getImageUrl(heroItem.poster_path, 'original') }} 
              style={styles.heroImg} 
            />
            <LinearGradient
              colors={['transparent', isLightMode ? 'rgba(245,245,247,0.5)' : 'rgba(10,10,10,0.5)', isLightMode ? '#F5F5F7' : '#0A0A0A']}
              locations={[0, 0.5, 1]}
              style={styles.heroGradient}
            />
            
            <View style={styles.heroContent}>
              <View style={styles.reasonBadge}>
                <BlurView tint={isLightMode ? "light" : "dark"} intensity={60} style={StyleSheet.absoluteFill} />
                <Text style={[styles.reasonText, isLightMode && { color: '#000' }]}>{reason}</Text>
              </View>

              <Text style={[styles.heroTitle, isLightMode && { color: '#000' }]} numberOfLines={2}>
                {heroItem.title || heroItem.name}
              </Text>

              <View style={styles.metaInfo}>
                <Text style={[styles.metaText, isLightMode && { color: '#333' }]}>
                  {(heroItem.release_date || heroItem.first_air_date)?.substring(0, 4)}
                </Text>
                <Text style={styles.metaDot}>•</Text>
                <View style={styles.ratingBadge}>
                  <MaterialIcons name="star" size={12} color="#FFD700" />
                  <Text style={styles.ratingText}>{heroItem.vote_average?.toFixed(1)}</Text>
                </View>
                <Text style={styles.metaDot}>•</Text>
                <Text style={[styles.metaText, isLightMode && { color: '#333' }]}>
                  {heroItem.media_type === 'tv' || heroItem.name ? 'Series' : 'Movie'}
                </Text>
              </View>

              <Text style={[styles.heroDesc, isLightMode && { color: '#555' }]} numberOfLines={3}>
                {heroItem.overview}
              </Text>

              <View style={styles.heroActions}>
                <TouchableOpacity 
                  style={styles.playButton} 
                  onPress={() => navigateToDetails(heroItem)}
                >
                  <MaterialIcons name="play-arrow" size={20} color="white" />
                  <Text style={styles.playButtonText}>Watch Now</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => navigateToDetails(heroItem)}
                >
                  <MaterialIcons name="info-outline" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Content Rows */}
        <View style={styles.sectionsContainer}>
          
          {/* Continue Watching (Real Data via Component) */}
          <ContinueWatchingRail data={historyItems} />

          {/* Movies For You */}
          {movieRecs.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, isLightMode && { color: '#000' }]}>Movies For You</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {movieRecs.map((item) => (
                  <TouchableOpacity 
                    key={`movie-${item.id}`} 
                    style={styles.card}
                    onPress={() => navigateToDetails({...item, media_type: 'movie'})}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: getImageUrl(item.poster_path) }} style={styles.cardImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* TV Series For You */}
          {tvRecs.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, isLightMode && { color: '#000' }]}>TV Series For You</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {tvRecs.map((item) => (
                  <TouchableOpacity 
                    key={`tv-${item.id}`} 
                    style={styles.card}
                    onPress={() => navigateToDetails({...item, media_type: 'tv'})}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: getImageUrl(item.poster_path) }} style={styles.cardImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'Audiowide',
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
    justifyContent: 'center',
    alignItems: 'center',
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
  scrollContent: {
    paddingBottom: 100,
  },
  heroSection: {
    width: '100%',
    height: height * 0.65,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    zIndex: 10,
  },
  reasonBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reasonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metaText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  metaDot: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: '90%',
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
    height: 48,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  playButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sectionsContainer: {
    gap: 30,
    marginTop: 10,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  sectionSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  horizontalScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: 120,
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  progressBarBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E50914',
  },
});
