export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          address: string;
          latitude: number;
          longitude: number;
          owner_id: string;
          created_at: string;
          phone: string | null;
          cuisine_type: string | null;
          opening_hours: string | null;
          geom: unknown;
          rating: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          address: string;
          latitude: number;
          longitude: number;
          owner_id: string;
          created_at?: string;
          phone?: string | null;
          cuisine_type?: string | null;
          opening_hours?: string | null;
          rating?: number | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          address?: string;
          latitude?: number;
          longitude?: number;
          owner_id?: string;
          created_at?: string;
          phone?: string | null;
          cuisine_type?: string | null;
          opening_hours?: string | null;
          rating?: number | null;
        };
      };
    };
    Functions: {
      find_nearby_restaurants: {
        Args: {
          lat: number;
          lon: number;
          radius_km?: number;
        };
        Returns: {
          id: string;
          name: string;
          description: string | null;
          address: string;
          latitude: number;
          longitude: number;
          phone: string | null;
          cuisine_type: string | null;
          opening_hours: string | null;
          distance_km: number;
          rating: number | null;
        }[];
      };
      find_nearby_restaurants_wkt: {
        Args: {
          lat: number;
          lon: number;
          radius_km?: number;
        };
        Returns: {
          id: string;
          name: string;
          description: string | null;
          address: string;
          latitude: number;
          longitude: number;
          phone: string | null;
          cuisine_type: string | null;
          opening_hours: string | null;
          distance_km: number;
          location_wkt: string;
          rating: number | null;
        }[];
      };
      get_restaurant_location_wkt: {
        Args: {
          restaurant_id: string;
        };
        Returns: string;
      };
    };
  };
}