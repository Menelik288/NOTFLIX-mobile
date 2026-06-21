import React from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const SkeletonBox = ({ style }: { style: any }) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;
  const { isLightMode } = useTheme();

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.8], // More dramatic pulse
  });

  return (
    <Animated.View style={[
      style, 
      { 
        opacity, 
        backgroundColor: isLightMode ? '#B0B0B0' : '#333333', // Bolder, darker skeleton blocks 
      }
    ]} />
  );
};

export const HomeSkeleton = () => {
  const { isLightMode } = useTheme();
  return (
    <View style={[styles.container, isLightMode && { backgroundColor: '#F5F5F7' }]}>
      {/* Hero Skeleton */}
      <View style={styles.heroSkeleton}>
        <SkeletonBox style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['transparent', isLightMode ? 'rgba(245,245,247,0.8)' : 'rgba(10,10,10,0.8)', isLightMode ? '#F5F5F7' : '#0A0A0A']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroContent}>
          <SkeletonBox style={styles.heroTag} />
          <SkeletonBox style={styles.heroTitle} />
          <SkeletonBox style={styles.heroDesc} />
          <View style={styles.heroActions}>
            <SkeletonBox style={styles.heroBtn} />
            <SkeletonBox style={styles.heroBtn} />
          </View>
        </View>
      </View>

      {/* Rail Skeletons */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.rail}>
          <SkeletonBox style={styles.railTitle} />
          <View style={styles.railContent}>
            {[1, 2, 3, 4].map((j) => (
              <SkeletonBox key={j} style={styles.card} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

export const GridSkeleton = () => {
  const { isLightMode } = useTheme();
  return (
    <View style={[styles.container, { paddingHorizontal: 24, paddingTop: 20 }, isLightMode && { backgroundColor: '#F5F5F7' }]}>
      <View style={styles.grid}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonBox key={i} style={styles.gridCard} />
        ))}
      </View>
    </View>
  );
};

export const EpisodeSkeleton = () => {
  const { isLightMode } = useTheme();
  return (
    <View style={styles.episodeSkeletonContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.episodeSkeletonCard}>
          <SkeletonBox style={styles.episodeSkeletonImage} />
          <SkeletonBox style={styles.episodeSkeletonTitle} />
        </View>
      ))}
    </View>
  );
};

export const HistorySkeleton = () => {
  const { isLightMode } = useTheme();
  return (
    <View style={[styles.container, { paddingHorizontal: 20, paddingTop: 10 }, isLightMode && { backgroundColor: '#F5F5F7' }]}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.historySkeletonCard}>
          <SkeletonBox style={styles.historySkeletonPoster} />
          <View style={styles.historySkeletonDetails}>
            <SkeletonBox style={styles.historySkeletonTitle} />
            <SkeletonBox style={styles.historySkeletonMeta} />
            <SkeletonBox style={styles.historySkeletonText} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  heroSkeleton: {
    width: '100%',
    height: height * 0.7,
    justifyContent: 'flex-end',
    paddingBottom: 60,
  },
  heroContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  heroTag: {
    width: 80,
    height: 12,
    borderRadius: 4,
  },
  heroTitle: {
    width: '70%',
    height: 32,
    borderRadius: 8,
  },
  heroDesc: {
    width: '90%',
    height: 16,
    borderRadius: 4,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  heroBtn: {
    width: 120,
    height: 40,
    borderRadius: 8,
  },
  rail: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  railTitle: {
    width: 150,
    height: 18,
    borderRadius: 4,
    marginBottom: 16,
  },
  railContent: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    width: 110,
    aspectRatio: 2/3,
    borderRadius: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  gridCard: {
    width: (width - 48 - 20) / 2,
    aspectRatio: 2/3,
    borderRadius: 12,
  },
  episodeSkeletonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  episodeSkeletonCard: {
    width: 160,
    gap: 8,
  },
  episodeSkeletonImage: {
    width: '100%',
    height: 90,
    borderRadius: 12,
  },
  episodeSkeletonTitle: {
    width: '80%',
    height: 14,
    borderRadius: 4,
  },
  historySkeletonCard: {
    flexDirection: 'row',
    height: 120,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  historySkeletonPoster: {
    width: 80,
    height: '100%',
  },
  historySkeletonDetails: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    gap: 12,
  },
  historySkeletonTitle: {
    width: '80%',
    height: 18,
    borderRadius: 4,
  },
  historySkeletonMeta: {
    width: '50%',
    height: 12,
    borderRadius: 4,
  },
  historySkeletonText: {
    width: '40%',
    height: 10,
    borderRadius: 4,
  },
});
