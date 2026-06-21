import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, StatusBar, Dimensions, ActivityIndicator, Alert, Platform, Modal, TextInput, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as ScreenOrientation from 'expo-screen-orientation';
import { fetchMovieDetails, fetchTVDetails, fetchSeasonDetails, getImageUrl } from '../lib/tmdb';
import { PROVIDERS, DEFAULT_PROVIDER, Provider, getSessionProvider, setSessionProvider } from '../lib/providers';

const { width, height } = Dimensions.get('window');

const PROFILE_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVcarYfZlPiao6I9OJqMwLkRsDMA_7SiGmpceY76DncPlja6KsMAoLjShYG1Jpb0Yh5ymKD-hl0qsvR80U3VtzIVoAMaqGlAL_8yBNHlcOOyjmTFZH8U1lTRL0SZLaDBOlNa5wPGk0_c0I-YqS01Iu4J1-9n-LfOYBhkB3iCmdoLrRGdMZuNGkyMLMo-lTadsR-oak7Lh-RvgY9I1RPDAysHkLtGfs1sgINCpRZGucW8USpk-8UBZj6uMRvlKlza25ZZr1FIJW-lNT';

import { HomeSkeleton, EpisodeSkeleton } from '../components/SkeletonLoader';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { toggleWatchlist, checkInWatchlist, saveProgress, fetchContinueWatching, fetchReviews, submitReview, fetchAverageRating } from '../lib/database';
import { useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';

export default function MovieDetailsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const { isLightMode } = useTheme();
  const { id, type, offlineUri } = useLocalSearchParams();
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const superembedRedirectAllowed = useRef(false);
  // TV specific state
  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);

  // Server selection state
  const [selectedProvider, setSelectedProvider] = useState<Provider>(getSessionProvider());
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewStats, setReviewStats] = useState({ average: '0', count: 0 });
  const [showAllReviews, setShowAllReviews] = useState(false);

  const handleSubmitReview = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    if (!user.user_metadata?.username) {
      Alert.alert(
        'Profile Required',
        'Please set a display name in your profile before posting reviews.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => router.push('/profile') }
        ]
      );
      return;
    }
    if (userRating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }
    if (!userComment.trim()) {
      Alert.alert('Comment Required', 'Please write a short comment about your experience.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await submitReview(Number(id), userRating, userComment);
      
      // Refresh reviews and stats
      const [updatedReviews, updatedStats] = await Promise.all([
        fetchReviews(Number(id)),
        fetchAverageRating(Number(id))
      ]);
      
      setReviews(updatedReviews);
      setReviewStats(updatedStats as any);
      setUserRating(0);
      setUserComment('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Review submitted successfully!', 'success');
    } catch (error) {
      console.warn('Submit Review Error:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser && id) {
        checkInWatchlist(Number(id), type as string).then(setIsInWatchlist);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser && id) {
        checkInWatchlist(Number(id), type as string).then(setIsInWatchlist);
      } else {
        setIsInWatchlist(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [id, type]);

  useEffect(() => {
    // Initial progress load from Supabase
    if (user && id) {
      fetchContinueWatching().then(data => {
        const existing = data.find((item: any) => item.media_id === Number(id) && item.media_type === type);
        if (existing) setWatchProgress(existing.progress);
      });
    }

    // Reset redirect flag when media changes
    superembedRedirectAllowed.current = false;

    // Load real reviews and stats
    if (id) {
      fetchReviews(Number(id)).then(setReviews);
      fetchAverageRating(Number(id)).then(setReviewStats as any);
    }
  }, [user, id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && user && movie) {
      // Simulate watching progress (1% every 10 seconds)
      interval = setInterval(() => {
        setWatchProgress(prev => {
          const next = Math.min(prev + 0.01, 1);
          
          // Auto-save every increment
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => {
            saveProgress({
              media_id: Number(id),
              media_type: type as string,
              title: movie.title || movie.name,
              poster_path: movie.poster_path,
              progress: next,
              season_number: type === 'tv' ? currentSeason : undefined,
              episode_number: type === 'tv' ? currentEpisode : undefined
            }).catch(console.warn);
          }, 1000);

          return next;
        });
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isPlaying, user, movie, id, type]);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        const data = type === 'tv' ? await fetchTVDetails(Number(id)) : await fetchMovieDetails(Number(id));
        setMovie(data);
        setLoading(false); // Hide main skeleton immediately after details load
        
        // Extract trailer
        const videos = data.videos?.results || [];
        const trailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') || 
                        videos.find((v: any) => v.type === 'Teaser' && v.site === 'YouTube') || 
                        videos[0];
        if (trailer && trailer.key) {
          setTrailerUrl(`https://www.youtube.com/embed/${trailer.key}`);
        }

        // If TV, fetch first season episodes in background
        if (type === 'tv') {
          loadEpisodes(Number(id), 1);
        }
      } catch (e) {
        console.warn("Movie details fetch issue (network):", e);
        setLoading(false);
      }
    };
    loadData();
  }, [id, type]);

  const loadEpisodes = async (tvId: number, seasonNum: number) => {
    setLoadingEpisodes(true);
    try {
      const data = await fetchSeasonDetails(tvId, seasonNum);
      setEpisodes(data.episodes || []);
    } catch (e) {
      console.warn("Failed to fetch episodes:", e);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const handleSeasonChange = (seasonNum: number) => {
    setCurrentSeason(seasonNum);
    setCurrentEpisode(1); // Reset to first episode of new season
    loadEpisodes(Number(id), seasonNum);
    setShowSeasonPicker(false);
  };

  const handleEpisodeSelect = (episodeNum: number) => {
    setCurrentEpisode(episodeNum);
    setIsPlaying(true);
  };

  const toggleOrientation = async () => {
    if (isLandscape) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsLandscape(false);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
      setIsLandscape(true);
    }
  };

  const handleClosePlayer = async () => {
    setIsPlaying(false);
    setIsPlayingTrailer(false);
    // Return to portrait only if we manually locked it
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    await ScreenOrientation.unlockAsync(); // Then unlock to allow system rotation again
    setIsLandscape(false);
  };

  if (loading || !movie) {
    return <HomeSkeleton />;
  }

  const cast = movie.credits?.cast?.slice(0, 10) || [];
  const recommendations = movie.recommendations?.results?.slice(0, 10) || [];

  const runtime = movie.runtime || (movie.episode_run_time && movie.episode_run_time[0]) || 0;
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  const runtimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const videoUrl = isPlayingTrailer 
    ? trailerUrl
    : (offlineUri as string || (type === 'tv' 
        ? selectedProvider.buildTvUrl(id as string, currentSeason, currentEpisode, movie.external_ids?.imdb_id || movie.imdb_id)
        : selectedProvider.buildMovieUrl(id as string, movie.external_ids?.imdb_id || movie.imdb_id)));

  return (
    <View style={[styles.container, isLightMode && { backgroundColor: '#F5F5F7' }]}>
      <StatusBar barStyle={isLightMode ? "dark-content" : "light-content"} translucent backgroundColor="transparent" />

      {/* Cinematic Custom Glass Header */}
      <View style={[
        styles.header, 
        { paddingTop: insets.top, height: 44 + insets.top, backgroundColor: 'transparent', elevation: 0, zIndex: 100 }
      ]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
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
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/search')}>
              <BlurView 
                tint="dark" 
                intensity={Platform.OS === 'android' ? 60 : 30} 
                style={[
                  StyleSheet.absoluteFill,
                  Platform.OS === 'android' && { backgroundColor: 'rgba(20,20,20,0.85)' }
                ]} 
              />
              <MaterialIcons name="search" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileBtn}
              onPress={() => user ? router.push('/profile') : router.push('/auth')}
            >
              <Image 
                source={user?.user_metadata?.avatar_url ? { uri: user.user_metadata.avatar_url } : require('../Icons/images.png')} 
                style={styles.profileImg} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Hero Section */}
        <View style={(isPlaying || isPlayingTrailer) ? [styles.heroSection, { minHeight: 0, height: width * 0.7 + 50, marginTop: 44 + insets.top, justifyContent: 'flex-start' }] : styles.heroSection}>
          {(isPlaying || isPlayingTrailer) ? (
            <>
              <View style={{ height: width * 0.7, backgroundColor: 'black' }}>
                <WebView 
                  source={{ uri: videoUrl || '' }} 
                  style={styles.playerWebView}
                  allowsFullscreenVideo={true}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  mediaPlaybackRequiresUserAction={false}
                  allowsInlineMediaPlayback={true}
                  onMessage={() => {}}

                  originWhitelist={['*']}
                  mixedContentMode="always"
                  userAgent="Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.181 Mobile Safari/537.36"
                  sharedCookiesEnabled={true}
                  thirdPartyCookiesEnabled={true}
                  androidLayerType="hardware"
                  cacheEnabled={true}
                  cacheMode="LOAD_DEFAULT"
                  setSupportMultipleWindows={false}
                  onShouldStartLoadWithRequest={(request) => {
                    const url = request.url;
                    const mainUrl = videoUrl || '';
                    
                    // Always allow the initial URL
                    if (url === mainUrl || url === 'about:blank') return true;
                    
                    // Special handling for Superembed's first redirect (the actual video)
                    if (selectedProvider.key === 'superembed' && !superembedRedirectAllowed.current) {
                      superembedRedirectAllowed.current = true;
                      return true;
                    }

                    // Always allow the initial URL
                    if (url === mainUrl || url === 'about:blank') return true;
                    
                    // Allow URLs that are part of the main provider's domain
                    const allowedDomains = [
                      'vidsrc', 'vidbinge', '2embed', 'godrive', 'imdb', 'tmdb', 
                      'google', 'multiembed', 'vidzee', 'primesrc'
                    ];
                    const isAllowed = allowedDomains.some(domain => url.toLowerCase().includes(domain));
                    
                    if (isAllowed) {
                      return true;
                    } else {
                      // It's likely an ad or redirect. Open in external browser!
                      Linking.openURL(url).catch(() => {});
                      return false; // Prevent it from loading in our app
                    }
                  }}
                />
              </View>
              
              {/* External Player Controls */}
              <View style={styles.playerControlsBar}>
                <TouchableOpacity 
                  style={styles.playerBarBtn} 
                  onPress={toggleOrientation}
                >
                  <MaterialIcons name={isLandscape ? "screen-lock-portrait" : "screen-lock-landscape"} size={18} color="white" />
                  <Text style={styles.playerBarBtnText}>Rotate</Text>
                </TouchableOpacity>
                
                <View style={styles.playerBarDivider} />


                <TouchableOpacity 
                  style={styles.playerBarBtn} 
                  onPress={handleClosePlayer}
                >
                  <MaterialIcons name="close" size={18} color="#E50914" />
                  <Text style={[styles.playerBarBtnText, { color: '#E50914' }]}>Close Player</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Image source={{ uri: getImageUrl(movie.poster_path, 'original') }} style={styles.heroImg} />
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
              <LinearGradient
                colors={['rgba(10,10,10,0.8)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.heroGradientSide}
              />
              
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle} numberOfLines={2}>{movie.title || movie.name}</Text>
                
                <View style={styles.metaInfo}>
                  <Text style={styles.metaText}>{(movie.release_date || movie.first_air_date)?.substring(0, 4)}</Text>
                  {movie.adult && (
                    <View style={styles.ageRating}>
                      <Text style={styles.ageRatingText}>18+</Text>
                    </View>
                  )}
                  {runtime > 0 && <Text style={styles.metaText}>{runtimeStr}</Text>}
                  <Text style={styles.metaDot}>•</Text>
                  <View style={styles.ratingBadge}>
                    <MaterialIcons name="star" size={12} color="#FFD700" />
                    <Text style={styles.ratingText}>{movie.vote_average?.toFixed(1)}</Text>
                  </View>
                  <Text style={styles.metaDot}>•</Text>
                  
                  {trailerUrl && (
                    <TouchableOpacity 
                      style={styles.metaTrailerBtn} 
                      onPress={() => {
                        setIsPlaying(false);
                        setIsPlayingTrailer(true);
                      }}
                    >
                      <FontAwesome name="youtube-play" size={14} color="#FF0000" />
                      <Text style={styles.metaTrailerText}>Trailer</Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.metaText}>{movie.genres?.[0]?.name}</Text>
                </View>

                <Text style={styles.heroDesc} numberOfLines={3}>
                  {movie.overview}
                </Text>

                <View style={styles.heroActions}>
                  <TouchableOpacity 
                    style={styles.playButton} 
                    onPress={() => {
                      // Immediate UI transition
                      setIsPlayingTrailer(false);
                      setIsPlaying(true);

                      // Save progress in background
                      if (user && movie) {
                        saveProgress({
                          media_id: Number(id),
                          media_type: type as string,
                          title: movie.title || movie.name,
                          poster_path: movie.poster_path,
                          progress: watchProgress || 0.01,
                          season_number: type === 'tv' ? currentSeason : undefined,
                          episode_number: type === 'tv' ? currentEpisode : undefined
                        }).catch(e => console.warn('BG Save Progress Error:', e));
                      }
                    }}
                  >
                    <MaterialIcons name="play-arrow" size={20} color="white" />
                    <Text style={styles.playButtonText}>Watch</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, isInWatchlist && styles.actionButtonActive]}
                    onPress={async () => {
                      if (user) {
                        try {
                          const { action } = await toggleWatchlist({
                            media_id: Number(id),
                            media_type: type as 'movie' | 'tv',
                            poster_path: movie.poster_path,
                            title: movie.title || movie.name
                          });
                          setIsInWatchlist(action === 'added');
                          showToast(
                            action === 'added' ? 'Added to My List' : 'Removed from My List',
                            'success'
                          );
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        } catch (e) {
                          showToast('Failed to update watchlist', 'error');
                        }
                      } else {
                        showToast('Sign in to save to My List', 'info');
                        router.push('/auth');
                      }
                    }}
                  >
                    <MaterialIcons 
                      name={isInWatchlist ? "check" : "add"} 
                      size={20} 
                      color={isInWatchlist ? "#E50914" : "white"} 
                    />
                    <Text style={[styles.actionButtonText, isInWatchlist && { color: '#E50914' }]}>
                      {isInWatchlist ? 'Added' : 'List'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => router.push('/downloads')}
                  >
                    <MaterialIcons name="file-download" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Download</Text>
                  </TouchableOpacity>

                </View>
        
              </View>
            </>
          )}
        </View>

        {/* Server Selector Section (Always below Hero actions) */}
        <View style={styles.serverSectionWrapper}>
          <Text style={[styles.sectionTitle, { marginLeft: 20, marginBottom: 12 }, isLightMode && { color: '#000' }]}>Servers</Text>
          <View style={[styles.serverSelectorContainer, { paddingHorizontal: 20 }]}>
            <TouchableOpacity 
              style={[
                styles.serverDropdown,
                isLightMode && { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.1)' }
              ]}
              onPress={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
              activeOpacity={0.7}
            >
              <BlurView 
                tint={isLightMode ? "light" : "dark"} 
                intensity={Platform.OS === 'android' ? 80 : 30} 
                style={[StyleSheet.absoluteFill, Platform.OS === 'android' && { backgroundColor: isLightMode ? 'rgba(255,255,255,0.85)' : 'rgba(30,30,30,0.9)' }]} 
              />
              <View style={styles.serverDropdownContent}>
                  <View style={styles.serverInfo}>
                    <MaterialIcons name="dns" size={18} color="#E50914" style={{ marginRight: 10 }} />
                    <Text style={[styles.serverName, isLightMode && { color: 'black' }]}>{selectedProvider.name}</Text>
                    {selectedProvider.key === 'vidsrc' && (
                      <View style={[styles.recommendedBadge, { marginLeft: 10 }]}>
                        <Text style={styles.recommendedText}>Recommended</Text>
                      </View>
                    )}
                    {selectedProvider.key === 'vidbinge' && (
                      <View style={{ flexDirection: 'row', gap: 6, marginLeft: 10 }}>
                        <View style={[styles.recommendedBadge, { backgroundColor: '#3B82F6' }]}>
                          <Text style={styles.recommendedText}>Good Quality</Text>
                        </View>
                        <View style={[styles.recommendedBadge, { backgroundColor: '#06B6D4' }]}>
                          <Text style={styles.recommendedText}>Movies</Text>
                        </View>
                      </View>
                    )}
                    {selectedProvider.key === '2embed' && (
                      <View style={[styles.recommendedBadge, { marginLeft: 10, backgroundColor: '#8B5CF6' }]}>
                        <Text style={styles.recommendedText}>Multiple Servers</Text>
                      </View>
                    )}
                  </View>
                <MaterialIcons 
                  name={isServerDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color={isLightMode ? "black" : "white"} 
                />
              </View>
            </TouchableOpacity>

            {isServerDropdownOpen && (
              <View style={styles.dropdownList}>
                <BlurView 
                  tint={isLightMode ? "light" : "dark"} 
                  intensity={Platform.OS === 'android' ? 95 : 40} 
                  style={[StyleSheet.absoluteFill, Platform.OS === 'android' && { backgroundColor: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(20,20,20,0.95)' }]} 
                />
                {PROVIDERS.map((provider) => (
                  <TouchableOpacity
                    key={provider.key}
                    style={[
                      styles.dropdownItem,
                      selectedProvider.key === provider.key && styles.dropdownItemActive
                    ]}
                    onPress={() => {
                      setSelectedProvider(provider);
                      setSessionProvider(provider);
                      setIsServerDropdownOpen(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[
                        styles.dropdownItemText,
                        isLightMode && { color: 'black' },
                        selectedProvider.key === provider.key && styles.dropdownItemTextActive
                      ]}>
                        {provider.name}
                      </Text>
                      {provider.key === 'vidsrc' && (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedText}>Recommended</Text>
                        </View>
                      )}
                      {provider.key === '2embed' && (
                        <View style={[styles.recommendedBadge, { backgroundColor: '#8B5CF6' }]}>
                          <Text style={styles.recommendedText}>Multiple Servers</Text>
                        </View>
                      )}
                    </View>
                    {selectedProvider.key === provider.key && (
                      <MaterialIcons name="check" size={18} color="#E50914" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* TV Series Season & Episode Selector */}
        {type === 'tv' && (
          <View style={styles.tvControlsContainer}>
            {/* Season Selector */}
            <View style={styles.seasonSelectorWrapper}>
              <TouchableOpacity 
                style={[
                  styles.seasonPickerButton,
                  isLightMode && { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.1)' }
                ]} 
                onPress={() => setShowSeasonPicker(!showSeasonPicker)}
              >
                <BlurView 
                  tint={isLightMode ? "light" : "dark"} 
                  intensity={Platform.OS === 'android' ? 80 : 30} 
                  style={[StyleSheet.absoluteFill, Platform.OS === 'android' && { backgroundColor: isLightMode ? 'rgba(255,255,255,0.85)' : 'rgba(30,30,30,0.9)' }]} 
                />
                <Text style={[styles.seasonPickerText, isLightMode && { color: 'black' }]}>Season {currentSeason}</Text>
                <MaterialIcons name={showSeasonPicker ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={20} color={isLightMode ? "black" : "white"} />
              </TouchableOpacity>
              
              {/* Season Picker Modal */}
              <Modal
                visible={showSeasonPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSeasonPicker(false)}
              >
                <View style={styles.modalOverlay}>
                  <TouchableOpacity 
                    style={StyleSheet.absoluteFill} 
                    onPress={() => setShowSeasonPicker(false)} 
                  />
                  <View style={[styles.seasonSheetContainer, isLightMode && { backgroundColor: '#F5F5F7' }]}>
                    <BlurView 
                      tint={isLightMode ? "light" : "dark"} 
                      intensity={Platform.OS === 'android' ? 95 : 40} 
                      style={[StyleSheet.absoluteFill, Platform.OS === 'android' && { backgroundColor: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(20,20,20,0.95)' }]} 
                    />
                    
                    <View style={styles.sheetHeader}>
                      <View style={styles.sheetHandle} />
                      <Text style={[styles.sheetTitle, isLightMode && { color: 'black' }]}>Select Season</Text>
                      <TouchableOpacity 
                        onPress={() => setShowSeasonPicker(false)}
                        style={styles.sheetCloseBtn}
                      >
                        <MaterialIcons name="close" size={24} color={isLightMode ? "black" : "white"} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView 
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.seasonListContent}
                    >
                      {movie.seasons?.filter((s: any) => s.season_number > 0).map((season: any) => (
                        <TouchableOpacity 
                          key={season.id} 
                          style={[
                            styles.seasonOptionItem, 
                            currentSeason === season.season_number && styles.seasonOptionActive,
                            isLightMode && { borderBottomColor: 'rgba(0,0,0,0.05)' }
                          ]}
                          onPress={() => handleSeasonChange(season.season_number)}
                        >
                          <View style={styles.seasonOptionContent}>
                            <Text style={[styles.seasonOptionTitle, isLightMode && { color: 'black' }]}>Season {season.season_number}</Text>
                            <Text style={[styles.seasonOptionCount, isLightMode && { color: 'rgba(0,0,0,0.5)' }]}>{season.episode_count} Episodes</Text>
                          </View>
                          {currentSeason === season.season_number && (
                            <MaterialIcons name="check-circle" size={24} color="#E50914" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </Modal>
            </View>

            {/* Episode Rail */}
            <View style={styles.episodeSection}>
              <Text style={[styles.sectionTitle, isLightMode && { color: '#000' }]}>Episodes</Text>
              {loadingEpisodes ? (
                <View style={{ height: 120, paddingHorizontal: 20 }}>
                  <EpisodeSkeleton />
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.episodeScroll}>
                  {episodes.map((episode: any) => (
                    <TouchableOpacity 
                      key={episode.id} 
                      style={[styles.episodeCard, currentEpisode === episode.episode_number && styles.episodeCardActive]}
                      onPress={() => handleEpisodeSelect(episode.episode_number)}
                    >
                      <View style={styles.episodeImageContainer}>
                        {episode.still_path ? (
                          <Image source={{ uri: getImageUrl(episode.still_path) }} style={styles.episodeImage} />
                        ) : (
                          <View style={[styles.episodeImage, { backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' }]}>
                            <MaterialIcons name="movie" size={24} color="#333" />
                          </View>
                        )}
                        <View style={styles.episodeNumberBadge}>
                          <Text style={styles.episodeNumberText}>E{episode.episode_number}</Text>
                        </View>
                        {currentEpisode === episode.episode_number && isPlaying && (
                          <View style={styles.playingOverlay}>
                            <MaterialIcons name="play-circle-filled" size={24} color="#E50914" />
                          </View>
                        )}
                      </View>
                      <Text style={[styles.episodeTitle, isLightMode && { color: '#000' }]} numberOfLines={1}>{episode.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        )}

        {/* Details Section */}
        <View style={styles.detailsContainer}>
          {/* Genres */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isLightMode && { color: '#000' }]}>Genres</Text>
            <View style={styles.genreTags}>
              {movie.genres?.map((genre: any) => (
                <View key={genre.id} style={[styles.genreTag, isLightMode && { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.1)' }]}>
                  <Text style={[styles.genreTagText, isLightMode && { color: '#000' }]}>{genre.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Cast */}
          {cast.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isLightMode && { color: '#000' }]}>Cast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castScroll}>
                {cast.map((person: any) => (
                  <View key={person.id} style={styles.castItem}>
                    <View style={styles.castImageContainer}>
                      {person.profile_path ? (
                        <Image source={{ uri: getImageUrl(person.profile_path) }} style={styles.castImage} />
                      ) : (
                        <View style={[styles.castImage, { backgroundColor: '#333' }]} />
                      )}
                    </View>
                    <Text style={[styles.castName, isLightMode && { color: '#000' }]} numberOfLines={1}>{person.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          {/* Reviews & Ratings Section */}
          <View style={styles.section}>
            <View style={styles.reviewHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, isLightMode && { color: '#000' }]}>Reviews & Ratings</Text>
                <Text style={styles.sectionSubtitle}>What viewers are saying</Text>
              </View>
              <View style={styles.ratingSummary}>
                <Text style={styles.averageRatingText}>{`${reviewStats.average || '0.0'}/5`}</Text>
                <Text style={styles.totalRatingsText}>Based on {reviewStats.count || 0} ratings</Text>
              </View>
            </View>

            {/* Review Input Area */}
            <View style={[styles.reviewInputContainer, isLightMode && { backgroundColor: 'rgba(0,0,0,0.03)', borderColor: 'rgba(0,0,0,0.05)' }]}>
              <Text style={[styles.inputLabel, isLightMode && { color: '#333' }]}>Rate this {type || 'movie'}</Text>
              <View style={styles.starSelector}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity 
                    key={star} 
                    onPress={() => {
                      setUserRating(star);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons 
                      name={star <= userRating ? "star" : "star-border"} 
                      size={28} 
                      color={star <= userRating ? "#FFD700" : "rgba(255,255,255,0.2)"} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.commentInput, isLightMode && { backgroundColor: 'rgba(0,0,0,0.05)', color: '#000', borderColor: 'rgba(0,0,0,0.1)' }]}
                placeholder={`Share your thoughts about this ${type || 'movie'}...`}
                placeholderTextColor={isLightMode ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.4)"}
                multiline
                numberOfLines={3}
                value={userComment}
                onChangeText={setUserComment}
                textAlignVertical="top"
              />
              <TouchableOpacity 
                style={[styles.submitReviewBtn, (!userRating || !userComment.trim()) && { opacity: 0.5 }]}
                onPress={handleSubmitReview}
                disabled={isSubmittingReview || !userRating || !userComment.trim()}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitReviewBtnText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Reviews List */}
            <View style={styles.reviewsList}>
              {reviews.length === 0 ? (
                <View style={styles.noReviewsContainer}>
                  <MaterialIcons name="rate-review" size={40} color="rgba(255,255,255,0.1)" />
                  <Text style={styles.noReviewsText}>No reviews yet. Be the first to share your thoughts!</Text>
                </View>
              ) : (
                <>
                  {(showAllReviews ? reviews : reviews.slice(0, 2)).map((review) => (
                    <View key={review.id} style={[styles.reviewCard, isLightMode && { backgroundColor: 'rgba(0,0,0,0.03)', borderColor: 'rgba(0,0,0,0.05)' }]}>
                      <View style={styles.reviewCardHeader}>
                        <Image source={review.avatar_url ? { uri: review.avatar_url } : require('../Icons/images.png')} style={styles.reviewAvatar} />
                        <View style={styles.reviewUserInfo}>
                          <Text style={[styles.reviewUsername, isLightMode && { color: '#000' }]}>{review.username || 'NotFlix User'}</Text>
                          <View style={styles.reviewRatingRow}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <MaterialIcons 
                                key={s} 
                                name={s <= review.rating ? "star" : (s - 0.5 <= review.rating ? "star-half" : "star-border")} 
                                size={12} 
                                color="#FFD700" 
                              />
                            ))}
                            <Text style={styles.reviewDate}>
                              {new Date(review.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Text style={[styles.reviewComment, isLightMode && { color: '#444' }]}>{review.content}</Text>
                    </View>
                  ))}
                  
                  {reviews.length > 2 && (
                    <TouchableOpacity 
                      style={styles.showMoreBtn} 
                      onPress={() => setShowAllReviews(!showAllReviews)}
                    >
                      <Text style={styles.showMoreText}>{showAllReviews ? 'Show Less' : `Show ${reviews.length - 2} More Reviews`}</Text>
                      <MaterialIcons 
                        name={showAllReviews ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                        size={18} 
                        color="#E50914" 
                      />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Recommended */}
          {recommendations.length > 0 && (
            <View style={styles.section}>
              <View style={styles.recommendedHeader}>
                <Text style={[styles.sectionTitle, isLightMode && { color: '#000' }]}>Recommended</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>SEE ALL</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castScroll}>
                {recommendations.map((rec: any) => (
                  <TouchableOpacity 
                    key={rec.id} 
                    style={styles.verticalCard} 
                    activeOpacity={0.8}
                    onPress={() => {
                      router.push({ pathname: '/movie', params: { id: rec.id, type: type || 'movie' } });
                      setIsPlaying(false);
                    }}
                  >
                    <Image source={{ uri: getImageUrl(rec.poster_path) }} style={styles.verticalCardImage} />
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
  scrollContent: {
    paddingBottom: 60,
  },
  header: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden' as const,
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 24,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logoText: {
    color: '#E50914',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
  },
  profileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  profileImg: {
    width: '100%',
    height: '100%',
  },
  heroSection: {
    width: '100%',
    minHeight: height * 0.7,
    justifyContent: 'flex-end',
    position: 'relative',
    zIndex: 1,
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
  heroGradientSide: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 10,
    zIndex: 10,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 36,
    maxWidth: '90%',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  metaText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaDot: {
    color: 'rgba(255,255,255,0.4)',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '700',
  },
  metaTrailerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  metaTrailerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  ageRating: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ageRatingText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
    maxWidth: '90%',
    marginBottom: 20,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
  },
  playButton: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E50914',
    height: 48,
    borderRadius: 12,
    gap: 8,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
    height: 48,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionButtonSuccess: {
    backgroundColor: '#22C55E',
  },
  actionButtonActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    borderColor: 'rgba(229, 9, 20, 0.5)',
    borderWidth: 1,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  playerControlsBar: {
    height: 50,
    backgroundColor: '#1A1A1A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  playerBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: '100%',
  },
  playerBarBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  playerBarDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tvControlsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    zIndex: 1,
  },
  seasonSelectorWrapper: {
    position: 'relative',
    marginBottom: 24,
    zIndex: 1000,
  },
  seasonPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  seasonPickerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  seasonSheetContainer: {
    height: height * 0.6,
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
  seasonListContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  seasonOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  seasonOptionContent: {
    gap: 4,
  },
  seasonOptionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  seasonOptionCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  episodeSection: {
    gap: 12,
  },
  episodeScroll: {
    gap: 12,
    paddingRight: 20,
  },
  episodeCard: {
    width: 160,
    gap: 6,
  },
  episodeCardActive: {
    opacity: 1,
  },
  episodeImageContainer: {
    width: '100%',
    height: 90,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1A1A1A',
  },
  episodeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  episodeNumberBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  episodeNumberText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 30,
    zIndex: 1,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  genreTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreTag: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#222',
    borderRadius: 20,
  },
  genreTagText: {
    color: '#eee',
    fontSize: 11,
    fontWeight: '600',
  },
  castScroll: {
    gap: 16,
  },
  castItem: {
    width: 80,
    alignItems: 'center',
    gap: 6,
  },
  castImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#222',
  },
  castImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    resizeMode: 'cover',
  },
  castName: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  recommendedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAllText: {
    color: '#E50914',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  verticalCard: {
    width: 110,
    aspectRatio: 2 / 3,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  verticalCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  serverSectionWrapper: {
    marginTop: 10,
    marginBottom: 20,
    zIndex: 1000,
    elevation: 50,
  },
  serverSelectorContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  serverDropdown: {
    height: 54,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  serverDropdownContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  serverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serverName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownList: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 2000,
    elevation: 100,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(229,9,20,0.1)',
  },
  dropdownItemText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#E50914',
    fontWeight: '700',
  },
  recommendedBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: -8,
  },
  ratingSummary: {
    alignItems: 'flex-end',
  },
  averageRatingText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '800',
  },
  totalRatingsText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
  reviewInputContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginTop: 8,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  starSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  commentInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    fontSize: 14,
    minHeight: 80,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  submitReviewBtn: {
    backgroundColor: '#E50914',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitReviewBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  reviewsList: {
    marginTop: 16,
    gap: 16,
  },
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
  },
  reviewUserInfo: {
    flex: 1,
    gap: 2,
  },
  reviewUsername: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewDate: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
  },
  reviewComment: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 20,
  },
  noReviewsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  noReviewsText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  showMoreText: {
    color: '#E50914',
    fontSize: 13,
    fontWeight: '700',
  },
  qualitySheetContainer: {
    height: height * 0.5,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  qualityListContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  qualityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  qualityItemText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
