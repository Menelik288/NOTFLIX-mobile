import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator, Modal, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { searchMulti, fetchMovieGenres, fetchTVGenres, discoverMedia, getImageUrl } from '../lib/tmdb';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GridSkeleton } from '../components/SkeletonLoader';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
// Calculate width: (Total Width - (Padding * 2) - Gap) / 2
const COLUMN_WIDTH = (width - 48 - 20) / 2;

const PROFILE_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVcarYfZlPiao6I9OJqMwLkRsDMA_7SiGmpceY76DncPlja6KsMAoLjShYG1Jpb0Yh5ymKD-hl0qsvR80U3VtzIVoAMaqGlAL_8yBNHlcOOyjmTFZH8U1lTRL0SZLaDBOlNa5wPGk0_c0I-YqS01Iu4J1-9n-LfOYBhkB3iCmdoLrRGdMZuNGkyMLMo-lTadsR-oak7Lh-RvgY9I1RPDAysHkLtGfs1sgINCpRZGucW8USpk-8UBZj6uMRvlKlza25ZZr1FIJW-lNT';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLightMode } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [genres, setGenres] = useState<any[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [filterYear, setFilterYear] = useState('');
  const [filterRating, setFilterRating] = useState('0');
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const data = mediaType === 'movie' ? await fetchMovieGenres() : await fetchTVGenres();
        setGenres(data.genres || []);
      } catch (e) {
        console.warn(e);
      }
    };
    loadGenres();
  }, [mediaType]);

  const handleSearch = useCallback(async (text: string, genreId: number | null = null, year: string = '', rating: string = '0') => {
    setLoading(true);
    try {
      let data;
      if (text.length > 2) {
        data = await searchMulti(text);
        setResults(data.results?.filter((i: any) => i.media_type !== 'person') || []);
      } else if (genreId || year || rating !== '0') {
        data = await discoverMedia(mediaType, { genre: genreId?.toString(), year, rating });
        setResults(data.results || []);
      } else {
        setResults([]);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [mediaType]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      handleSearch(query, selectedGenre, filterYear, filterRating);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, selectedGenre, filterYear, filterRating, handleSearch]);

  const applyFilters = () => {
    setShowFilters(false);
    handleSearch(query, selectedGenre, filterYear, filterRating);
  };

  const resetFilters = () => {
    setFilterYear('');
    setFilterRating('0');
    setSelectedGenre(null);
    setMediaType('movie');
    setShowFilters(false);
  };

  return (
    <>
      <View style={[styles.container, isLightMode && { backgroundColor: '#F5F5F7' }]}>
        <StatusBar style={isLightMode ? "dark" : "light"} />
        
        {/* Cinematic Custom Glass Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10, height: 64 + insets.top }]}>
          <BlurView 
            tint={isLightMode ? "light" : "dark"} 
            intensity={Platform.OS === 'android' ? 80 : 50} 
            style={[StyleSheet.absoluteFill, Platform.OS === 'android' && { backgroundColor: isLightMode ? 'rgba(255,255,255,0.85)' : 'rgba(10,10,10,0.9)' }]} 
          />
          {!isLightMode && (
            <LinearGradient
              colors={['rgba(0,0,0,0.8)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} 
                style={styles.backBtn}
              >
                <BlurView 
                  tint={isLightMode ? "dark" : "light"} 
                  intensity={Platform.OS === 'android' ? 60 : 30} 
                  style={[
                    StyleSheet.absoluteFill,
                    Platform.OS === 'android' && { backgroundColor: isLightMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)' }
                  ]} 
                />
                <MaterialIcons name="arrow-back-ios" size={20} color={isLightMode ? "#FFF" : "white"} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, isLightMode && { color: 'black' }]}>Search</Text>
            </View>
            <View style={{ width: 38 }} />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingTop: 74 + insets.top }]}>
          <View style={styles.searchSection}>
            <View style={[styles.searchContainer, isLightMode && { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.1)' }]}>
              <MaterialIcons name="search" size={24} color={isLightMode ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)"} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, isLightMode && { color: 'black' }]}
                placeholder="Search by title or genre"
                placeholderTextColor={isLightMode ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)"}
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterBtn}>
                <BlurView 
                  tint={isLightMode ? "light" : "dark"} 
                  intensity={Platform.OS === 'android' ? 60 : 20} 
                  style={[
                    StyleSheet.absoluteFill,
                    Platform.OS === 'android' && { backgroundColor: isLightMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.6)' }
                  ]} 
                />
                <MaterialIcons name="tune" size={22} color={selectedGenre || filterYear || filterRating !== '0' ? '#E50914' : (isLightMode ? "black" : "white")} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Genre Chips */}
          <View style={styles.genresContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genresScroll}>
              {genres.slice(0, 10).map((genre) => (
                <TouchableOpacity 
                  key={genre.id} 
                  style={[styles.genreChip, isLightMode && { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.1)' }, selectedGenre === genre.id && styles.genreChipActive]}
                  onPress={() => setSelectedGenre(selectedGenre === genre.id ? null : genre.id)}
                >
                  <BlurView tint={isLightMode ? "light" : "dark"} intensity={10} style={StyleSheet.absoluteFill} />
                  <Text style={[styles.genreChipText, isLightMode && { color: 'rgba(0,0,0,0.6)' }, selectedGenre === genre.id && styles.genreChipTextActive]}>{genre.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Results */}
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsTitle, isLightMode && { color: 'black' }]}>
                {loading ? 'Searching...' : results.length > 0 ? 'Results' : query.length > 2 ? 'No Results Found' : 'Results'}
              </Text>
              {results.length > 0 && <Text style={[styles.resultsCount, isLightMode && { color: 'rgba(0,0,0,0.5)' }]}>{results.length} Results Found</Text>}
            </View>

            {loading ? (
              <GridSkeleton />
            ) : (
              <View style={styles.resultsGrid}>
                {results.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.card}
                    onPress={() => router.push({ pathname: '/movie', params: { id: item.id, type: item.media_type || mediaType } })}
                  >
                    <View style={styles.cardImageContainer}>
                      <Image source={{ uri: getImageUrl(item.poster_path) }} style={styles.cardImage} />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.cardGradient}
                      />
                      <View style={styles.qualityBadge}>
                        <Text style={styles.qualityText}>4K</Text>
                      </View>
                    </View>
                    <Text style={[styles.cardTitle, isLightMode && { color: 'black' }]} numberOfLines={1}>{item.title || item.name}</Text>
                    <View style={styles.cardMeta}>
                      <MaterialIcons name="star" size={14} color="#E50914" />
                      <Text style={[styles.cardMetaText, isLightMode && { color: 'rgba(0,0,0,0.6)' }]}>
                        {item.vote_average?.toFixed(1)} • {(item.release_date || item.first_air_date)?.substring(0, 4)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Filter Modal */}
        <Modal visible={showFilters} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowFilters(false)} />
            <BlurView 
              tint={isLightMode ? "light" : "dark"} 
              intensity={Platform.OS === 'android' ? 90 : (isLightMode ? 60 : 25)} 
              style={[styles.modalContent, Platform.OS === 'android' && { backgroundColor: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(20,20,20,0.95)' }]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, isLightMode && { color: 'black' }]}>Filters</Text>
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <MaterialIcons name="close" size={24} color={isLightMode ? "black" : "white"} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={[styles.filterLabel, isLightMode && { color: 'black' }]}>Media Type</Text>
                <View style={styles.typeToggle}>
                  <TouchableOpacity 
                    style={[styles.typeBtn, mediaType === 'movie' && styles.typeBtnActive]}
                    onPress={() => setMediaType('movie')}
                  >
                    <BlurView tint={isLightMode ? "light" : "dark"} intensity={15} style={StyleSheet.absoluteFill} />
                    {mediaType === 'movie' && <View style={styles.activeIndicator} />}
                    <Text style={[styles.typeText, isLightMode && { color: 'black' }, mediaType === 'movie' && { color: '#E50914' }]}>Movies</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.typeBtn, mediaType === 'tv' && styles.typeBtnActive]}
                    onPress={() => setMediaType('tv')}
                  >
                    <BlurView tint={isLightMode ? "light" : "dark"} intensity={15} style={StyleSheet.absoluteFill} />
                    {mediaType === 'tv' && <View style={styles.activeIndicator} />}
                    <Text style={[styles.typeText, isLightMode && { color: 'black' }, mediaType === 'tv' && { color: '#E50914' }]}>TV Shows</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.filterLabel, isLightMode && { color: 'black' }]}>Release Year</Text>
                <View style={styles.glassInputWrapper}>
                  <BlurView tint={isLightMode ? "light" : "dark"} intensity={15} style={StyleSheet.absoluteFill} />
                  <TextInput
                    style={[styles.filterInput, isLightMode && { color: 'black' }]}
                    placeholder="e.g. 2024"
                    placeholderTextColor={isLightMode ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)"}
                    keyboardType="numeric"
                    value={filterYear}
                    onChangeText={setFilterYear}
                  />
                </View>

                <Text style={[styles.filterLabel, isLightMode && { color: 'black' }]}>Genres</Text>
                <View style={styles.filterGenresGrid}>
                  {genres.map((genre) => (
                    <TouchableOpacity 
                      key={genre.id} 
                      style={[styles.filterGenreItem, selectedGenre === genre.id && styles.filterGenreItemActive]}
                      onPress={() => setSelectedGenre(selectedGenre === genre.id ? null : genre.id)}
                    >
                      <BlurView tint={isLightMode ? "light" : "dark"} intensity={20} style={StyleSheet.absoluteFill} />
                      {selectedGenre === genre.id && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(229, 9, 20, 0.15)' }]} />}
                      <Text style={[styles.filterGenreText, isLightMode && { color: 'black' }, selectedGenre === genre.id && { color: '#E50914', fontWeight: '700' }]}>{genre.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.filterLabel, isLightMode && { color: 'black' }]}>Minimum Rating ({filterRating}+)</Text>
                <View style={styles.ratingContainer}>
                  {[0, 2, 4, 6, 8].map((val) => (
                    <TouchableOpacity 
                      key={val} 
                      style={[styles.ratingBtn, Number(filterRating) === val && styles.ratingBtnActive]}
                      onPress={() => setFilterRating(val.toString())}
                    >
                      <BlurView tint={isLightMode ? "light" : "dark"} intensity={20} style={StyleSheet.absoluteFill} />
                      {Number(filterRating) === val && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(229, 9, 20, 0.15)' }]} />}
                      <Text style={[styles.ratingBtnText, isLightMode && { color: 'black' }, Number(filterRating) === val && { color: '#E50914', fontWeight: '800' }]}>{val}+</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ height: 40 }} />
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                  <BlurView tint={isLightMode ? "light" : "dark"} intensity={20} style={StyleSheet.absoluteFill} />
                  <Text style={[styles.resetBtnText, isLightMode && { color: 'rgba(0,0,0,0.6)' }]}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                  <BlurView tint="dark" intensity={30} style={StyleSheet.absoluteFill} />
                  <LinearGradient
                    colors={['rgba(229, 9, 20, 0.8)', 'rgba(229, 9, 20, 0.6)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.applyBtnText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
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
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingLeft: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden' as const,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  profileImg: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 54,
    color: '#FFFFFF',
    fontSize: 16,
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  genresContainer: {
    marginBottom: 24,
  },
  genresScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  genreChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  genreChipActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  genreChipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  genreChipTextActive: {
    color: '#FFFFFF',
  },
  resultsContainer: {
    paddingHorizontal: 24,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultsTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  resultsCount: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  card: {
    width: COLUMN_WIDTH,
    marginBottom: 10,
  },
  cardImageContainer: {
    width: '100%',
    aspectRatio: 2/3,
    borderRadius: 16,
    overflow: 'hidden' as const,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover' as const,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  qualityBadge: {
    position: 'absolute' as const,
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  qualityText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700' as const,
    marginTop: 8,
    marginBottom: 3,
  },
  cardMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  cardMetaText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    maxHeight: '88%',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderBottomWidth: 0,
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 28,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
  },
  modalBody: {
    paddingVertical: 10,
  },
  filterLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 16,
  },
  typeToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  typeBtnActive: {
    borderColor: '#E50914',
    borderWidth: 1.5,
  },
  activeIndicator: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  glassInputWrapper: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  filterInput: {
    flex: 1,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  ratingBtn: {
    width: (width - 80) / 5,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    overflow: 'hidden',
  },
  ratingBtnActive: {
    borderColor: '#E50914',
    borderWidth: 1.5,
  },
  ratingBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  filterGenresGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  filterGenreItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  filterGenreItemActive: {
    borderColor: '#E50914',
    borderWidth: 1.5,
  },
  filterGenreText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  modalFooter: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  resetBtn: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  applyBtn: {
    flex: 2,
    height: 58,
    borderRadius: 18,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800' as const,
  },
});
