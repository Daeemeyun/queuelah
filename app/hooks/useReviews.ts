import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@lib/supabase';

export interface Review {
  id: string;
  eatery_id: string;
  user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  updated_at: string;
  username: string;
  username_color: string;
  is_pro: boolean;
}

export function useReviews(eateryId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('reviews')
      .select(`
        id, eatery_id, user_id, rating, body, created_at, updated_at,
        user_profiles ( username, username_color, subscription_tier )
      `)
      .eq('eatery_id', eateryId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    const shaped: Review[] = (data ?? []).map((r: any) => ({
      id: r.id,
      eatery_id: r.eatery_id,
      user_id: r.user_id,
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
      updated_at: r.updated_at,
      username: r.user_profiles?.username ?? 'Anonymous',
      username_color: r.user_profiles?.username_color ?? 'default',
      is_pro: r.user_profiles?.subscription_tier === 'pro',
    }));

    setReviews(shaped);
    setLoading(false);
  }, [eateryId]);

  useEffect(() => { load(); }, [load]);

  async function submitReview(
    userId: string,
    rating: number,
    body: string,
  ): Promise<{ error: string | null }> {
    const { error: err } = await supabase
      .from('reviews')
      .upsert(
        { eatery_id: eateryId, user_id: userId, rating, body: body.trim() || null },
        { onConflict: 'eatery_id,user_id' },
      );
    if (err) return { error: err.message };
    await load();
    return { error: null };
  }

  async function deleteReview(reviewId: string): Promise<{ error: string | null }> {
    const { error: err } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);
    if (err) return { error: err.message };
    setReviews(prev => prev.filter(r => r.id !== reviewId));
    return { error: null };
  }

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  return { reviews, loading, error, averageRating, submitReview, deleteReview, reload: load };
}
