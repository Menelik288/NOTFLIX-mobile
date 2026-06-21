import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getImageUrl } from '../lib/tmdb';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface ContinueWatchingProps {
  data: any[];
}

export const ContinueWatchingRail: React.FC<ContinueWatchingProps> = ({ data }) => {
  const router = useRouter();
  const { isLightMode } = useTheme();

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isLightMode && { color: '#000' }]}>Continue Watching</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {data.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/movie', params: { id: item.media_id, type: item.media_type } })}
          >
            <View style={[styles.imageContainer, isLightMode && { backgroundColor: '#E5E5EA', borderColor: 'rgba(0,0,0,0.1)' }]}>
                <Image 
                  source={{ uri: getImageUrl(item.poster_path) }} 
                  style={styles.image} 
                />
                <View style={styles.overlay}>
                  <View style={styles.playIcon}>
                    <MaterialIcons name="play-arrow" size={20} color="white" />
                  </View>
                </View>
                {/* Progress Bar */}
                <View style={[styles.progressBg, isLightMode && { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                  <View style={[styles.progressFill, { width: `${item.progress * 100}%` }]} />
                </View>
              </View>
              <View style={styles.details}>
                <Text style={[styles.itemTitle, isLightMode && { color: '#000' }]} numberOfLines={1}>{item.title}</Text>
                {item.media_type === 'tv' && (
                  <Text style={[styles.itemSubtitle, isLightMode && { color: '#666' }]}>S{item.season_number} E{item.episode_number}</Text>
                )}
              </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 20,
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 14,
  },
  card: {
    width: 160,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(229, 9, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  progressBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E50914',
    borderRadius: 2,
  },
  details: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  itemTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  itemSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  }
});
