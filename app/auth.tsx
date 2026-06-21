import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Dimensions, 
  Animated, 
  KeyboardAvoidingView, 
  Platform, 
  StatusBar,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';

const { width, height } = Dimensions.get('window');

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bgAnim, {
            toValue: 1,
            duration: 10000,
            useNativeDriver: false,
          }),
          Animated.timing(bgAnim, {
            toValue: 0,
            duration: 10000,
            useNativeDriver: false,
          })
        ])
      ).start()
    ]).start();
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showToast('Welcome back!', 'success');
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              username: email.split('@')[0],
              avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email.split('@')[0]}`,
            }
          }
        });
        if (error) throw error;
        showToast('Account created successfully! Please sign in.', 'success');
        setIsLogin(true);
      }
      if (isLogin) router.replace('/(tabs)');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const bgInterpolate1 = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0A0A0A', '#1A0A0A']
  });

  const bgInterpolate2 = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E5091422', '#00000000']
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgInterpolate1 }]}>
      <StatusBar barStyle="light-content" transparent />
      
      {/* Background Animated Elements */}
      <Animated.View 
        style={[
          styles.bgCircle, 
          { 
            backgroundColor: bgInterpolate2,
            transform: [
              { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 50] }) },
              { scale: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }
            ]
          }
        ]} 
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity 
            style={[styles.backBtn, { top: insets.top + 10 }]} 
            onPress={async () => {
              // Ensure we are truly clean before leaving
              if (!isLogin) {
                setIsLogin(true);
              } else {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }
            }}
          >
            <BlurView 
              tint="light" 
              intensity={Platform.OS === 'android' ? 60 : 20} 
              style={[
                StyleSheet.absoluteFill,
                Platform.OS === 'android' && { backgroundColor: 'rgba(255,255,255,0.4)' }
              ]} 
            />
            <MaterialIcons name="close" size={22} color="white" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.logo}>NOTFLIX</Text>
            <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Sign in to access your personal watchlist' : 'Join the world\'s largest streaming community'}
            </Text>
          </View>

          <BlurView 
            tint="dark" 
            intensity={Platform.OS === 'android' ? 80 : 40} 
            style={[
              styles.glassCard,
              Platform.OS === 'android' && { backgroundColor: 'rgba(20,20,20,0.92)' }
            ]}
          >
            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="email" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity 
                style={styles.authBtn} 
                onPress={handleAuth}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#E50914', '#B81D24']}
                  style={styles.authBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.authBtnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.toggleBtn} 
                onPress={() => setIsLogin(!isLogin)}
              >
                <Text style={styles.toggleText}>
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <Text style={styles.toggleTextBold}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.footerText}>OR CONTINUE WITH</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.socialBtns}>
                <TouchableOpacity style={styles.socialBtn}>
                  <BlurView 
                    tint="light" 
                    intensity={Platform.OS === 'android' ? 50 : 15} 
                    style={[
                      StyleSheet.absoluteFill,
                      Platform.OS === 'android' && { backgroundColor: 'rgba(255,255,255,0.25)' }
                    ]} 
                  />
                  <FontAwesome name="google" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn}>
                  <BlurView tint="light" intensity={15} style={StyleSheet.absoluteFill} />
                  <FontAwesome name="apple" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn}>
                  <BlurView tint="light" intensity={15} style={StyleSheet.absoluteFill} />
                  <FontAwesome name="facebook" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  bgCircle: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logo: {
    fontSize: 42,
    fontWeight: '900',
    color: '#E50914',
    letterSpacing: 4,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
  glassCard: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 24,
    gap: 16,
  },
  form: {
    gap: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  authBtn: {
    height: 56,
    borderRadius: 14,
    marginTop: 6,
    overflow: 'hidden',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  authBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authBtnText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  toggleBtn: {
    alignItems: 'center',
    marginTop: 10,
  },
  toggleText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  toggleTextBold: {
    color: '#E50914',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 8,
    alignItems: 'center',
    gap: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  footerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  socialBtns: {
    flexDirection: 'row',
    gap: 16,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
});
