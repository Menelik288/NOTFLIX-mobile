import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  TouchableOpacity 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    setToast({ message, type });
    
    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(20);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();

    timerRef.current = setTimeout(() => {
      hideToast();
    }, 4000);
  }, []);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setToast(null);
    });
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const getColor = (type: ToastType) => {
    switch (type) {
      case 'success': return '#22C55E';
      case 'error': return '#E50914';
      default: return '#3B82F6';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View 
          style={[
            styles.toastWrapper, 
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={[styles.toastContainer, { borderLeftColor: getColor(toast.type) }]}>
            <MaterialIcons name={getIcon(toast.type)} size={20} color={getColor(toast.type)} />
            <Text style={styles.toastText} numberOfLines={2}>{toast.message}</Text>
            <TouchableOpacity onPress={hideToast}>
              <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  }
});
