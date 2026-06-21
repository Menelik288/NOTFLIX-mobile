import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { fetchHistory } from '../lib/database';
import { fetchMovieDetails, fetchTVDetails, getImageUrl } from '../lib/tmdb';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { HistorySkeleton } from '../components/SkeletonLoader';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLightMode } = useTheme();
  
  const [user, setUser] = useState<User | null>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadHistory();
      } else {
        setLoading(false);
      }
    });
  }, []);

  const loadHistory = async () => {
    try {
      const historyData = await fetchHistory();
      
      // Fetch additional details from TMDB for rating and release date
      const enrichedHistory = await Promise.all(
        historyData.map(async (item: any) => {
          try {
            const details = item.media_type === 'tv' 
              ? await fetchTVDetails(item.media_id)
              : await fetchMovieDetails(item.media_id);
              
            return {
              ...item,
              rating: details.vote_average || 0,
              release_date: details.release_date || details.first_air_date || 'Unknown',
            };
          } catch (e) {
            console.warn('Error fetching details for history item', e);
            return item;
          }
        })
      );
      
      setHistoryItems(enrichedHistory);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Unknown') return 'Unknown';
    const date = new Date(dateString);
    return date.getFullYear().toString();
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
        <Text style={[styles.headerTitle, isLightMode && { color: '#000' }]}>History</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {loading ? (
          <HistorySkeleton />
        ) : historyItems.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
            <MaterialIcons name="history" size={60} color={isLightMode ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"} />
            <Text style={{ color: isLightMode ? '#666' : 'rgba(255,255,255,0.5)', marginTop: 20, fontSize: 16 }}>No watch history found.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {historyItems.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => {
                  router.push({ pathname: '/movie', params: { id: item.media_id, type: item.media_type } });
                }}
              >
                <BlurView 
                  tint={isLightMode ? "light" : "dark"} 
                  intensity={Platform.OS === 'android' ? 90 : 20} 
                  style={[
                    StyleSheet.absoluteFill,
                    { borderRadius: 16 },
                    Platform.OS === 'android' && { 
                      backgroundColor: isLightMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.4)' 
                    }
                  ]} 
                />
                
                <Image source={{ uri: getImageUrl(item.poster_path) }} style={styles.poster} />
                
                <View style={styles.details}>
                  <Text style={[styles.title, isLightMode && { color: '#000' }]} numberOfLines={2}>{item.title}</Text>
                  
                  <View style={styles.metaContainer}>
                    <View style={styles.metaBadge}>
                      <MaterialIcons name="star" size={14} color="#FFD700" />
                      <Text style={[styles.metaText, isLightMode && { color: '#666' }]}>
                        {item.rating ? item.rating.toFixed(1) : 'NR'}
                      </Text>
                    </View>
                    <View style={styles.dot} />
                    <Text style={[styles.metaText, isLightMode && { color: '#666' }]}>{formatDate(item.release_date)}</Text>
                    <View style={styles.dot} />
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeText}>{item.media_type === 'tv' ? 'TV' : 'Movie'}</Text>
                    </View>
                  </View>

                  {item.media_type === 'tv' && item.season_number && item.episode_number && (
                    <Text style={[styles.episodeText, isLightMode && { color: '#888' }]}>
                      S{item.season_number} E{item.episode_number}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
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
  listContainer: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  poster: {
    width: 80,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  details: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  typeBadge: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    color: '#E50914',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  episodeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
});
