import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage
  },
  global: {
    headers: {
      'X-Client-Info': 'restaurant-map-app'
    }
  }
});

// Add a helper function for better error handling
export async function handleSupabaseError<T>(
  promise: Promise<{ data: T | null; error: any }>
): Promise<T> {
  try {
    const { data, error } = await promise;
    if (error) {
      console.error('Supabase operation error:', error);
      throw error;
    }
    if (!data) throw new Error('No data returned');
    return data;
  } catch (error: any) {
    console.error('Supabase operation failed:', error);
    throw new Error(error.message || 'An unexpected error occurred');
  }
}

// Function to find nearby restaurants using WKT
export async function findNearbyRestaurantsWkt(
  latitude: number,
  longitude: number,
  radiusKm: number = 5
) {
  return handleSupabaseError(
    supabase.rpc('find_nearby_restaurants_wkt', {
      lat: latitude,
      lon: longitude,
      radius_km: radiusKm
    })
  );
}

// Function to get restaurant location as WKT
export async function getRestaurantLocationWkt(restaurantId: string) {
  return handleSupabaseError(
    supabase.rpc('get_restaurant_location_wkt', {
      restaurant_id: restaurantId
    })
  );
}