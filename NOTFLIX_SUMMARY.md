# NotFlix Mobile - Project Summary & Walkthrough

This document summarizes the development journey, key features, and technical implementations of the **NotFlix** streaming application.

## 🚀 Key Features

### 1. Immersive UI Redesign
- **Home Screen**: Features a rotating hero banner (20s interval) and organized horizontal rails for "Continue Watching", "Trending Movies", "Top Rated Movies/TV", and "Now Playing".
- **Movies Screen**: Features a rotating hero banner and dedicated rails for "Trending Now", "Action & Adventure", "Comedy This Week", and "All-Time Popular".
- **TV Screen**: Features a rotating hero banner and rails for "Trending TV Now", "Action & Adventure", and "Popular Series".
- **Auto-Scrolling Rails**: Introduced `AutoScrollingRail` component that automatically slides horizontally every 10 seconds.
- **Cinematic Loading**: Implemented a global **Skeleton Loading system** for a premium, non-blocking browsing experience.

### 2. User Accounts & Sync (Supabase)
- **Cinematic Auth**: A high-end Login/Signup screen (`app/auth.tsx`) with glassmorphism and animated backgrounds.
- **Dynamic Watchlist**: Real-time sync with Supabase Database. Users can add/remove movies from any screen and view them in the dedicated "My Watchlist" tab.
- **Profile Management**: A dedicated profile screen for managing account settings and signing out.
- **Guest Access**: Intelligent "Members Only" prompts for guests trying to access cloud-synced features.

### 3. Advanced Search & Filtering
- **Real-time Search**: Multi-type search (Movies/TV) with debounced input.
- **Advanced Filters**: Cinematic overlay to filter by Media Type, Release Year, Minimum Rating, and Genre.
- **Grid-based Results**: Search outcomes are displayed in a dense 2-column grid.

### 4. Deep Movie & TV Insights
- **Rating Badge**: Live TMDB ratings displayed next to genres.
- **YouTube Trailers**: Integrated trailer button with a branded YouTube icon.
- **Season & Episode Management**: Custom dropdowns and rails to navigate between seasons and launch specific episodes.

### 5. High-Quality Media Playback
- **Global Auto-Rotation**: Updated `app.json` configuration to support system-wide rotation.
- **Manual Rotation Toggle**: Top-left rotate button in the video player for manual orientation overrides.

---

## 🛠 Technical Implementation

### UI Design System
- **Skeleton Loaders**: Reusable pulsing components for all layout types (Grid, Hero, Rail).
- **Design Aesthetic**: Glassmorphism effects, high-contrast dark theme, and premium typography.
- **Haptic Feedback**: Integrated `expo-haptics` for physical confirmation on major actions (Download, Watchlist).

### Backend & API
- **Supabase Integration**: 
    - Auth: Email/Password authentication with persistent sessions.
    - Database: Relational schema for `profiles`, `watchlist`, `ratings`, and `comments`.
    - RLS: Row Level Security ensures data privacy.
- **TMDB Integration**: Extended to support complex filtering, genre retrieval, and multi-media discovery.

---

## 📁 Build & Export Instructions

### Generate Debug APK
To create the current debug version for testing:
```bash
cd android && ./gradlew assembleDebug
```
**Location**: `android/app/build/outputs/apk/debug/app-debug.apk`

### Generate Release APK (Production)
To create a high-performance version for sharing:
```bash
cd android && ./gradlew assembleRelease
```
**Location**: `android/app/build/outputs/apk/release/app-release-unsigned.apk`

---

**Developed with ❤️ for NotFlix.**
