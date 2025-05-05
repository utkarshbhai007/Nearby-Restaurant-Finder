import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StarRating } from '../components/StarRating';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat, transform } from 'ol/proj';
import { Style, Icon, Circle, Fill, Stroke } from 'ol/style';
import { MapPin, Star } from 'lucide-react';

export function RegisterRestaurant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [nearbyRestaurants, setNearbyRestaurants] = useState<any[]>([]);
  const vectorSourceRef = useRef<VectorSource>(new VectorSource());
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    phone: '',
    cuisine_type: '',
    opening_hours: '',
    rating: 0
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current
    });

    const newMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        vectorLayer
      ],
      view: new View({
        center: fromLonLat([0, 0]),
        zoom: 2
      })
    });

    // Handle map clicks
    newMap.on('click', (event) => {
      const coordinate = transform(event.coordinate, 'EPSG:3857', 'EPSG:4326');
      setFormData(prev => ({
        ...prev,
        latitude: coordinate[1].toFixed(6),
        longitude: coordinate[0].toFixed(6)
      }));

      // Update marker
      vectorSourceRef.current.clear();
      const feature = new Feature({
        geometry: new Point(event.coordinate)
      });
      feature.setStyle(new Style({
        image: new Icon({
          src: 'https://cdn.jsdelivr.net/npm/lucide-static@0.344.0/icons/map-pin.svg',
          scale: 1.0,
          opacity: 0.8
        })
      }));
      vectorSourceRef.current.addFeature(feature);
    });

    setMap(newMap);

    // Get user's location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
          setUserLocation(coords);
          newMap.getView().animate({
            center: fromLonLat(coords),
            zoom: 13
          });

          // Add user location marker
          const userFeature = new Feature({
            geometry: new Point(fromLonLat(coords))
          });
          userFeature.setStyle(new Style({
            image: new Circle({
              radius: 8,
              fill: new Fill({ color: '#4c1d95' }),
              stroke: new Stroke({
                color: '#ffffff',
                width: 2
              })
            })
          }));
          vectorSourceRef.current.addFeature(userFeature);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }

    return () => {
      newMap.setTarget(undefined);
    };
  }, []);

  // Fetch nearby restaurants when user location is available
  useEffect(() => {
    const fetchNearbyRestaurants = async () => {
      if (!userLocation) return;

      try {
        const data = await handleSupabaseError(
          supabase
            .from('restaurants')
            .select('*')
        );

        const nearby = data.filter(restaurant => {
          const distance = calculateDistance(
            userLocation[1],
            userLocation[0],
            restaurant.latitude,
            restaurant.longitude
          );
          return distance <= 5; // 5km radius
        });

        setNearbyRestaurants(nearby);

        // Add nearby restaurants to map
        nearby.forEach(restaurant => {
          const feature = new Feature({
            geometry: new Point(fromLonLat([restaurant.longitude, restaurant.latitude]))
          });
          feature.setStyle(new Style({
            image: new Icon({
              src: 'https://cdn.jsdelivr.net/npm/lucide-static@0.344.0/icons/utensils.svg',
              scale: 0.8,
              opacity: 0.8
            })
          }));
          vectorSourceRef.current.addFeature(feature);
        });
      } catch (error) {
        console.error('Error fetching nearby restaurants:', error);
      }
    };

    fetchNearbyRestaurants();
  }, [userLocation]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const validateForm = () => {
    // Check required fields
    if (!formData.name.trim()) {
      setError('Restaurant name is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    if (!formData.address.trim()) {
      setError('Address is required');
      return false;
    }
    if (!formData.latitude || !formData.longitude) {
      setError('Please select a location on the map');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!user) {
      setError('You must be logged in to register a restaurant');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Prepare the restaurant data with proper type conversions
      const restaurantData = {
        name: formData.name,
        description: formData.description || null,
        address: formData.address,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        phone: formData.phone || null,
        cuisine_type: formData.cuisine_type || null,
        opening_hours: formData.opening_hours || null,
        owner_id: user.id
      };

      // Only add rating if it's greater than 0
      if (formData.rating > 0) {
        // @ts-ignore - We know this is valid
        restaurantData.rating = formData.rating;
      }

      console.log('Submitting restaurant data:', restaurantData);

      const { data, error: submitError } = await supabase
        .from('restaurants')
        .insert([restaurantData])
        .select();

      if (submitError) {
        console.error('Error details:', submitError);
        throw new Error(submitError.message || 'Error registering restaurant');
      }
      
      console.log('Restaurant registered successfully:', data);
      navigate('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Error registering restaurant. Please check all fields and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleRatingChange = (rating: number) => {
    setFormData(prev => ({
      ...prev,
      rating
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Form Section */}
      <div className="w-1/2 p-8 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-8">
            Register Your Restaurant
          </h2>

          <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4">
            <div className="space-y-6">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Restaurant Name*
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Description*
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Address*
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Latitude*
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    readOnly
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Longitude*
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    readOnly
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Cuisine Type
                </label>
                <input
                  type="text"
                  name="cuisine_type"
                  value={formData.cuisine_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Opening Hours
                </label>
                <input
                  type="text"
                  name="opening_hours"
                  value={formData.opening_hours}
                  onChange={handleChange}
                  placeholder="e.g., Mon-Fri: 9AM-10PM"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center">
                  <span className="mr-2">Restaurant Rating</span>
                  <Star className="h-4 w-4 text-yellow-400" />
                </label>
                <div className="mt-1">
                  <StarRating 
                    initialRating={formData.rating} 
                    onChange={handleRatingChange} 
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.rating > 0 
                      ? `You've rated your restaurant ${formData.rating} out of 5 stars` 
                      : 'Click to rate your restaurant'}
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                Fields marked with * are required
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    <span>Registering...</span>
                  </div>
                ) : (
                  'Register Restaurant'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Map Section */}
      <div className="w-1/2 relative">
        <div ref={mapRef} className="absolute inset-0">
          {/* Map will be rendered here */}
        </div>
        
        {/* Nearby Restaurants Panel */}
        {nearbyRestaurants.length > 0 && (
          <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-sm">
            <h3 className="font-semibold mb-2">Nearby Restaurants (5km radius)</h3>
            <div className="max-h-48 overflow-y-auto">
              {nearbyRestaurants.map(restaurant => (
                <div key={restaurant.id} className="mb-2 p-2 hover:bg-gray-50 rounded">
                  <div className="font-medium">{restaurant.name}</div>
                  <div className="text-sm text-gray-500">
                    {calculateDistance(
                      userLocation![1],
                      userLocation![0],
                      restaurant.latitude,
                      restaurant.longitude
                    ).toFixed(1)} km away
                  </div>
                  {restaurant.rating && (
                    <div className="flex items-center text-sm">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 mr-1" />
                      <span>{restaurant.rating}/5</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg">
          <p className="text-sm text-gray-600">
            Click on the map to set restaurant location
          </p>
        </div>
      </div>
    </div>
  );
}