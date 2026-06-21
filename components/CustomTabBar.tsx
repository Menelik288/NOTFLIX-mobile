import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, interpolateColor } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// We calculate the tab width based on the container width.
// Let's say the container is width - 40.
const CONTAINER_WIDTH = width - 40;
const TAB_WIDTH = CONTAINER_WIDTH / 5;

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isLightMode } = useTheme();
  
  // The animated position of the active highlight pill
  const translateX = useSharedValue(state.index * TAB_WIDTH);

  useEffect(() => {
    translateX.value = withSpring(state.index * TAB_WIDTH, {
      mass: 0.6,
      damping: 16,
      stiffness: 150,
      overshootClamping: false,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
  }, [state.index, translateX]);

  const animatedHighlightStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View style={[styles.wrapper, { bottom: Platform.OS === 'ios' ? insets.bottom + 10 : 20 }]}>
      <BlurView 
        tint={isLightMode ? "light" : "dark"} 
        intensity={Platform.OS === 'android' ? 90 : (isLightMode ? 40 : 20)} 
        style={[
          styles.container, 
          isLightMode ? { 
            backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.05)', 
            borderColor: 'rgba(0,0,0,0.1)' 
          } : {
            backgroundColor: Platform.OS === 'android' ? 'rgba(20,20,20,0.95)' : 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(255,255,255,0.1)'
          }
        ]}
      >        
        {/* Animated Highlight Pill */}
        <Animated.View style={[styles.highlight, animatedHighlightStyle]}>
          <View style={[
            styles.highlightPill, 
            isLightMode ? { 
              backgroundColor: Platform.OS === 'android' ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.1)', 
              borderColor: 'rgba(0,0,0,0.05)' 
            } : {
              backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
              borderColor: 'rgba(255,255,255,0.1)'
            }
          ]}>
            <BlurView tint={isLightMode ? "dark" : "light"} intensity={Platform.OS === 'android' ? 50 : 15} style={StyleSheet.absoluteFill} />
          </View>
        </Animated.View>

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Get the icon name based on the route name
          let iconName: keyof typeof MaterialIcons.glyphMap = 'home';
          if (route.name === 'movies') iconName = 'movie';
          if (route.name === 'foryou') iconName = 'stars';
          if (route.name === 'tv') iconName = 'tv';
          if (route.name === 'watchlist') iconName = 'bookmark';

          if (route.name === 'foryou') {
            // Render a transparent placeholder to keep spacing in the tab bar
            return (
              <View key={route.key} style={styles.centerTabContainer}>
                <Text style={[
                  styles.tabLabel, 
                  { 
                    marginTop: 38, // Keep text aligned with others
                    color: isFocused ? (isLightMode ? '#E50914' : '#FFFFFF') : (isLightMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)') 
                  }
                ]}>
                  For You
                </Text>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
              activeOpacity={0.8}
            >
              <MaterialIcons 
                name={iconName} 
                size={22} 
                color={isFocused ? (isLightMode ? '#E50914' : '#FFFFFF') : (isLightMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)')} 
              />
              <Text 
                style={[
                  styles.tabLabel, 
                  { color: isFocused ? (isLightMode ? '#E50914' : '#FFFFFF') : (isLightMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)') }
                ]}
              >
                {label as string}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>

      {/* Raised Center Button (Rendered Outside to avoid clipping) */}
      {state.routes.map((route, index) => {
        if (route.name !== 'foryou') return null;
        
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <View key="foryou-button" style={[styles.centerCutoutWrapper, { backgroundColor: isLightMode ? '#F5F5F7' : '#0A0A0A' }]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={[
                styles.centerTabButton, 
                isLightMode && { borderColor: 'rgba(0,0,0,0.1)' }
              ]}
              activeOpacity={0.9}
            >
              <BlurView 
                tint={isLightMode ? "light" : "dark"} 
                intensity={Platform.OS === 'android' ? 100 : 80} 
                style={StyleSheet.absoluteFill} 
              />
              <LinearGradient
                colors={isFocused 
                  ? ['#E50914', '#990000'] 
                  : (isLightMode ? ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.4)'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)'])}
                style={StyleSheet.absoluteFill}
              />
              <MaterialIcons 
                name="stars" 
                size={28} 
                color={isFocused ? "#FFFFFF" : (isLightMode ? "#000000" : "#FFFFFF")} 
              />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 100,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    width: CONTAINER_WIDTH,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  highlight: {
    position: 'absolute',
    width: TAB_WIDTH,
    height: '100%',
    paddingVertical: 6,
    paddingHorizontal: 8,
    zIndex: 0,
  },
  highlightPill: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  tabLabel: {
    fontFamily: 'Audiowide',
    fontSize: 9,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  centerTabContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 10,
  },
  centerCutoutWrapper: {
    position: 'absolute',
    top: -24,
    alignSelf: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    // The background color of this wrapper matches the screen, 
    // creating a solid cutout over the nav bar's top border
  },
  centerTabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
