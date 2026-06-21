# 🎬 NotFlix

[![Web Version](https://img.shields.io/badge/Web_Version-Available-blue)](https://notflix-yu1n.onrender.com/)
[![React Native](https://img.shields.io/badge/React_Native-Cross_Platform-61DAFB?logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-Go-000020?logo=expo)](https://expo.dev/)

NotFlix is a premium, cross-platform streaming application clone designed to offer a cinematic, immersive browsing experience. Available natively on iOS and Android, as well as on [the Web](https://notflix-yu1n.onrender.com/). It leverages modern design aesthetics, real-time data from TMDB, and secure backend integration via Supabase.

🌐 **Try the Web Version:** [https://notflix-yu1n.onrender.com/](https://notflix-yu1n.onrender.com/)

## 🚀 Key Features

### 1. Immersive UI Redesign
- **Home Screen**: Features a rotating hero banner and organized horizontal rails for "Continue Watching", "Trending Movies", "Top Rated", and "Now Playing".
- **Movies & TV Screens**: Dedicated rails for trending content, genres, and popular series.
- **Auto-Scrolling Rails**: Automatically sliding carousels for premium content discovery.
- **Cinematic Loading**: Global Skeleton Loading system for a seamless, non-blocking browsing experience.

### 2. User Accounts & Sync
- **Cinematic Auth**: High-end Login/Signup screen with glassmorphism and animated backgrounds.
- **Dynamic Watchlist**: Real-time sync with Supabase. Add/remove movies from any screen and view them in "My Watchlist".
- **Profile Management**: Dedicated profile screen for account settings and secure sign-out.

### 3. Advanced Search & Filtering
- **Real-time Search**: Multi-type search (Movies/TV) with debounced input.
- **Advanced Filters**: Cinematic overlay to filter by Media Type, Release Year, Minimum Rating, and Genre.
- **Grid-based Results**: Dense 2-column grid layout for search outcomes.

### 4. Deep Movie & TV Insights
- **Rating Badges & Genres**: Live TMDB ratings and dynamic categorization.
- **YouTube Trailers**: Integrated trailer button with branded YouTube playback.
- **Season & Episode Management**: Navigate between TV seasons and episodes seamlessly.

### 5. High-Quality Media Playback
- **Global Auto-Rotation**: Full system-wide rotation support for an optimal viewing angle.
- **Manual Rotation Toggle**: Convenient rotate button in the video player for manual overrides.

---

## 🛠 Technical Stack

- **Frontend**: React Native, Expo, Expo Router
- **Styling**: Glassmorphism effects, high-contrast dark theme, custom Skeleton Loaders
- **Backend & Auth**: Supabase (PostgreSQL, Row Level Security, Auth)
- **Data Source**: TMDB API (The Movie Database)
- **Haptics**: `expo-haptics` for physical confirmation on major actions

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase and TMDB keys.
```bash
cp .env.example .env
```

### 3. Start the App
```bash
npx expo start
```

---

## 📁 Build Instructions

### Generate Debug APK
To create the current debug version for Android testing:
```bash
cd android && ./gradlew assembleDebug
```
**Location**: `android/app/build/outputs/apk/debug/app-debug.apk`

### Generate Release APK
To create a high-performance version for sharing:
```bash
cd android && ./gradlew assembleRelease
```
**Location**: `android/app/build/outputs/apk/release/app-release-unsigned.apk`

---

**Developed with ❤️ for NotFlix.**
