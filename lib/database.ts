import { supabase } from './supabase';

export type WatchlistItem = {
  media_id: number;
  media_type: 'movie' | 'tv';
  poster_path: string;
  title: string;
};

/**
 * Helper to get the current authenticated user ID safely
 */
const getSafeUserId = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;
    
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (e) {
    return null;
  }
};

export const toggleWatchlist = async (item: WatchlistItem) => {
  try {
    const userId = await getSafeUserId();
    if (!userId) {
      console.warn('Watchlist operation blocked: No authenticated user.');
      return { action: 'blocked' };
    }

    // Passing userId explicitly to resolve auth.uid() return null issues in some environments
    const { data, error } = await supabase.rpc('toggle_watchlist_item', {
      u_id: userId,
      m_id: Math.floor(Number(item.media_id)),
      m_type: item.media_type,
      p_path: item.poster_path,
      t_title: item.title
    });

    if (error) {
      console.error('[DB] Watchlist RPC Error:', error);
      throw error;
    }

    return { action: data as 'added' | 'removed' };
  } catch (error) {
    console.error('Watchlist Toggle Error:', error);
    throw error;
  }
};

export const fetchWatchlist = async (passedUserId?: string) => {
  try {
    const userId = passedUserId || await getSafeUserId();
    if (!userId) return [];

    const { data, error } = await supabase.rpc('get_my_watchlist', {
      u_id: userId
    });

    if (error) {
      console.error('[DB] Fetch Watchlist RPC Error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Watchlist fetch issue:', error);
    return [];
  }
};

export const checkInWatchlist = async (mediaId: number, mediaType: string) => {
  try {
    const userId = await getSafeUserId();
    if (!userId) return false;

    const { data, error } = await supabase.rpc('is_in_watchlist', {
      u_id: userId,
      m_id: Math.floor(Number(mediaId)),
      m_type: mediaType
    });

    if (error) {
      console.error('[DB] Check Watchlist RPC Error:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Check watchlist error:', error);
    return false;
  }
};

export const submitRating = async (mediaId: number, rating: number) => {
  const userId = await getSafeUserId();
  if (!userId) return;

  const { error } = await supabase
    .from('ratings')
    .upsert({ user_id: userId, media_id: mediaId, rating }, { onConflict: 'user_id,media_id' });
  
  if (error) throw error;
};

export const submitComment = async (mediaId: number, content: string) => {
  const userId = await getSafeUserId();
  if (!userId) return;

  const { error } = await supabase
    .from('comments')
    .insert({ user_id: userId, media_id: mediaId, content });
  
  if (error) throw error;
};

export const submitReview = async (mediaId: number, rating: number, content: string) => {
  try {
    const userId = await getSafeUserId();
    if (!userId) throw new Error('Unauthorized');

    const { error } = await supabase.rpc('submit_user_review', {
      u_id: userId,
      m_id: mediaId,
      r_rating: rating,
      c_content: content
    });

    if (error) {
      console.error('[DB] Submit Review RPC Error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Submit review issue:', error);
    throw error;
  }
};

export const updateProfile = async (userId: string, username: string, avatarUrl: string) => {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      username,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;

  const { error: authError } = await supabase.auth.updateUser({
    data: { username, avatar_url: avatarUrl }
  });

  if (authError) throw authError;
};

export const fetchReviews = async (mediaId: number) => {
  try {
    const { data, error } = await supabase.rpc('get_media_reviews', {
      m_id: mediaId
    });

    if (error) {
      console.error('[DB] Fetch Reviews RPC Error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Fetch reviews error:', error);
    return [];
  }
};

export const fetchAverageRating = async (mediaId: number) => {
  try {
    const { data, error } = await supabase.rpc('get_media_stats', {
      m_id: mediaId
    });

    if (error) {
      console.error('[DB] Media Stats RPC Error:', error);
      return { average: '0.0', count: 0 };
    }

    if (!data || data.length === 0) return { average: '0.0', count: 0 };

    return { 
      average: Number(data[0].average_rating).toFixed(1), 
      count: Number(data[0].rating_count) 
    };
  } catch (error) {
    console.error('Fetch average rating error:', error);
    return { average: '0.0', count: 0 };
  }
};

export const saveProgress = async (item: any) => {
  try {
    const userId = await getSafeUserId();
    if (!userId) return;

    const { error } = await supabase.rpc('save_watch_progress', {
      u_id: userId,
      m_id: Math.floor(Number(item.media_id)),
      m_type: item.media_type,
      t_title: item.title,
      p_path: item.poster_path,
      p_progress: item.progress,
      s_num: item.season_number || null,
      e_num: item.episode_number || null
    });
    
    if (error) {
      console.warn('[DB] Save Progress RPC Error:', error);
    }
  } catch (error) {
    console.error('Save progress error:', error);
  }
};

export const fetchContinueWatching = async (passedUserId?: string) => {
  try {
    const userId = passedUserId || await getSafeUserId();
    if (!userId) return [];

    const { data, error } = await supabase.rpc('get_my_continue_watching', {
      u_id: userId
    });

    if (error) {
      console.error('[DB] Fetch Continue Watching RPC Error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Fetch progress error:', error);
    return [];
  }
};

export const fetchHistory = async (passedUserId?: string) => {
  // Uses the same secure RPC as continue watching
  return fetchContinueWatching(passedUserId);
};

// Removed deleteAccountData as requested

// Removed deleteAccountData as requested
