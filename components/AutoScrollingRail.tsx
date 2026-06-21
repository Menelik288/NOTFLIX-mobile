import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { getImageUrl } from '../lib/tmdb';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = 120;
const SCROLL_STEP = CARD_WIDTH * 2;

interface AutoScrollingRailProps {
  title: string;
  data: any[];
  type: 'movie' | 'tv';
}

export const AutoScrollingRail: React.FC<AutoScrollingRailProps> = ({ title, data, type }) => {
  const router = useRouter();
  const { isLightMode } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const scrollPos = useRef(0);

  useEffect(() => {
    if (data.length === 0) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const maxScroll = (data.length * (CARD_WIDTH + 12)) - width;
        if (scrollPos.current >= maxScroll) {
          scrollPos.current = 0;
          scrollRef.current.scrollTo({ x: 0, animated: true });
        } else {
          scrollPos.current += SCROLL_STEP;
          scrollRef.current.scrollTo({ x: scrollPos.current, animated: true });
        }
      }
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [data]);

  if (data.length === 0) return null;

  return (
    <View style={styles.rail}>
      <Text style={[styles.railTitle, isLightMode && { color: '#000' }]}>{title}</Text>
      <ScrollView 
        ref={scrollRef}
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.railScrollContent}
        onScroll={(e) => {
          scrollPos.current = e.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
      >
        {data.map(item => (
          <TouchableOpacity 
            key={item.id} 
            style={[styles.verticalCard, isLightMode && { backgroundColor: '#E5E5EA', borderColor: 'rgba(0,0,0,0.1)' }]} 
            activeOpacity={0.8} 
            onPress={() => router.push({ pathname: '/movie', params: { id: item.id, type: item.media_type || type } })}
          >
            <Image source={{ uri: getImageUrl(item.poster_path) }} style={styles.verticalCardImage} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rail: {
    marginBottom: 8,
  },
  railTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 20,
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  railScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  verticalCard: {
    width: CARD_WIDTH,
    aspectRatio: 2/3,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  verticalCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});
