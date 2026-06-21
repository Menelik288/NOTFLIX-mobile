import { fetchRecommendations, fetchSimilar, fetchTrending, fetchTrendingTV } from './tmdb';

export type RecommendationSource = {
  media_id: number;
  media_type: 'movie' | 'tv';
  title?: string;
  poster_path?: string;
};

/**
 * Generates personalized recommendations by aggregating multiple user signals.
 * 
 * @param watchlist - Array of items from user's watchlist
 * @param continueWatching - Array of items user is currently watching
 * @param history - Array of items user has previously watched (optional, can be merged with continueWatching)
 * @returns Object containing movie and tv recommendations
 */
export const getPersonalizedRecommendations = async (
  watchlist: RecommendationSource[] = [],
  continueWatching: RecommendationSource[] = [],
  history: RecommendationSource[] = []
) => {
  try {
    // 1. Combine all unique signals and shuffle them for diversity
    const allSignals = [...continueWatching, ...watchlist, ...history];
    
    // Remove duplicates
    const uniqueSignals = Array.from(
      new Map(allSignals.map(item => [`${item.media_id}-${item.media_type}`, item])).values()
    ).sort(() => Math.random() - 0.5); // Randomize seeds for even representation

    if (uniqueSignals.length === 0) {
      const [trendingMovies, trendingTV] = await Promise.all([fetchTrending(), fetchTrendingTV()]);
      return {
        movies: trendingMovies.results.slice(0, 20),
        tv: trendingTV.results.slice(0, 20),
        reason: "Trending Now"
      };
    }

    // 2. Select up to 15 diverse seeds
    const seeds = uniqueSignals.slice(0, 15);

    // 3. Fetch recommendations for all seeds in parallel
    const recommendationPromises = seeds.map(seed => 
      fetchRecommendations(seed.media_type, seed.media_id)
        .then(res => res.results || [])
        .catch(() => [])
    );

    const allResultsPerSeed = await Promise.all(recommendationPromises);

    // 4. Round-Robin Distribution
    // Instead of scoring by frequency, we pick 1 from each seed, then 2nd from each, etc.
    const movies: any[] = [];
    const tv: any[] = [];
    const movieIds = new Set<number>();
    const tvIds = new Set<number>();

    // Max 20 results per category
    const targetCount = 20;
    let maxItemsPerSeed = 20; // TMDB usually returns 20

    for (let i = 0; i < maxItemsPerSeed; i++) {
      for (let j = 0; j < allResultsPerSeed.length; j++) {
        const item = allResultsPerSeed[j][i];
        if (!item) continue;

        const isMovie = item.media_type === 'movie' || (!item.name && item.title);
        
        if (isMovie && movies.length < targetCount && !movieIds.has(item.id)) {
          movies.push(item);
          movieIds.add(item.id);
        } else if (!isMovie && tv.length < targetCount && !tvIds.has(item.id)) {
          tv.push(item);
          tvIds.add(item.id);
        }

        if (movies.length >= targetCount && tv.length >= targetCount) break;
      }
      if (movies.length >= targetCount && tv.length >= targetCount) break;
    }

    // 5. Fallback if logic above didn't find enough items
    if (movies.length < 5 || tv.length < 5) {
      const [trendingMovies, trendingTV] = await Promise.all([fetchTrending(), fetchTrendingTV()]);
      const finalMovies = [...movies, ...trendingMovies.results.filter(m => !movieIds.has(m.id))].slice(0, 20);
      const finalTV = [...tv, ...trendingTV.results.filter(t => !tvIds.has(t.id))].slice(0, 20);
      return { movies: finalMovies, tv: finalTV, reason: "Curated for you" };
    }

    return {
      movies,
      tv,
      reason: "Inspired by your taste"
    };

  } catch (error) {
    console.warn('Personalized Recommendations Error:', error);
    const [trendingMovies, trendingTV] = await Promise.all([fetchTrending(), fetchTrendingTV()]);
    return {
      movies: trendingMovies.results.slice(0, 20),
      tv: trendingTV.results.slice(0, 20),
      reason: "Trending Today"
    };
  }
};
