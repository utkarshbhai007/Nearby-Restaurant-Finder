import React, { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Circle from 'ol/geom/Circle';
import { fromLonLat, transform } from 'ol/proj';
import { Style, Icon, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import { defaults as defaultControls } from 'ol/control';
import Overlay from 'ol/Overlay';
import { supabase, handleSupabaseError, findNearbyRestaurantsWkt } from '../lib/supabase';
import { Search, Navigation, Clock, MapPin, Route, Crosshair, Utensils, Star } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  phone: string;
  cuisine_type: string;
  opening_hours: string;
  distance_km?: number;
  location_wkt?: string;
  rating?: number | null;
}

interface DirectionsInfo {
  distance: number;
  duration: number;
  route: number[][];
}

const LAYER_TYPES = {
  OSM: 'OpenStreetMap',
  SATELLITE: 'Satellite',
  TERRAIN: 'Terrain'
};

const TRAVEL_SPEEDS = {
  WALKING: 5, // km/h
  DRIVING: 50 // km/h
};

export function MapComponent() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [selectedLayer, setSelectedLayer] = useState(LAYER_TYPES.OSM);
  const [clickedCoords, setClickedCoords] = useState<[number, number] | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [nearbyRestaurants, setNearbyRestaurants] = useState<Restaurant[]>([]);
  const [showNearbyRadius, setShowNearbyRadius] = useState(false);
  const [directions, setDirections] = useState<DirectionsInfo | null>(null);
  const [travelMode, setTravelMode] = useState<'WALKING' | 'DRIVING'>('DRIVING');
  const popupRef = useRef<HTMLDivElement>(null);
  const vectorSourceRef = useRef<VectorSource>(new VectorSource());
  const radiusLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const data = await handleSupabaseError(
          supabase
            .from('restaurants')
            .select('*')
        );
        setRestaurants(data);
      } catch (error) {
        console.error('Error fetching restaurants:', error);
      }
    };

    fetchRestaurants();
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
          setUserLocation(coords);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  const fetchNearbyRestaurants = async () => {
    if (!userLocation) return;
    
    try {
      const nearby = await findNearbyRestaurantsWkt(userLocation[1], userLocation[0], 5);
      setNearbyRestaurants(nearby);
      setShowNearbyRadius(true);
      
      // Update map to show radius
      if (map && userLocation) {
        const radiusFeature = new Feature({
          geometry: new Circle(
            fromLonLat(userLocation),
            5000 // 5km in meters
          )
        });

        radiusFeature.setStyle(new Style({
          stroke: new Stroke({
            color: 'rgba(255, 0, 0, 0.8)',
            width: 2
          }),
          fill: new Fill({
            color: 'rgba(255, 0, 0, 0.1)'
          })
        }));

        const radiusSource = new VectorSource({
          features: [radiusFeature]
        });

        if (radiusLayerRef.current) {
          map.removeLayer(radiusLayerRef.current);
        }

        radiusLayerRef.current = new VectorLayer({
          source: radiusSource,
          zIndex: 1
        });

        map.addLayer(radiusLayerRef.current);
        
        // Center map on user location with appropriate zoom
        map.getView().animate({
          center: fromLonLat(userLocation),
          zoom: 13,
          duration: 1000
        });
      }
    } catch (error) {
      console.error('Error fetching nearby restaurants:', error);
    }
  };

  const clearNearbyRadius = () => {
    if (map && radiusLayerRef.current) {
      map.removeLayer(radiusLayerRef.current);
      radiusLayerRef.current = null;
    }
    setShowNearbyRadius(false);
    setNearbyRestaurants([]);
  };

  useEffect(() => {
    if (!mapRef.current) return;

    const layers = {
      [LAYER_TYPES.OSM]: new TileLayer({
        source: new OSM()
      }),
      [LAYER_TYPES.SATELLITE]: new TileLayer({
        source: new XYZ({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        })
      }),
      [LAYER_TYPES.TERRAIN]: new TileLayer({
        source: new XYZ({
          url: 'https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg'
        })
      })
    };

    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
      zIndex: 2
    });

    const newMap = new Map({
      target: mapRef.current,
      layers: [
        layers[selectedLayer],
        vectorLayer
      ],
      controls: defaultControls(),
      view: new View({
        center: userLocation ? fromLonLat(userLocation) : fromLonLat([0, 0]),
        zoom: userLocation ? 13 : 2
      })
    });

    const popup = new Overlay({
      element: popupRef.current!,
      positioning: 'bottom-center',
      stopEvent: false,
      offset: [0, -10]
    });
    newMap.addOverlay(popup);

    addMarkersToMap();

    newMap.on('click', (event) => {
      const coordinate = transform(event.coordinate, 'EPSG:3857', 'EPSG:4326');
      setClickedCoords([coordinate[1], coordinate[0]]);

      const feature = newMap.forEachFeatureAtPixel(event.pixel, (feature) => feature);
      
      if (feature) {
        const restaurant = feature.get('restaurant');
        if (restaurant) {
          setSelectedRestaurant(restaurant);
          popup.setPosition(event.coordinate);
          
          newMap.getView().animate({
            center: event.coordinate,
            zoom: 17,
            duration: 1000
          });
        } else {
          setSelectedRestaurant(null);
          popup.setPosition(undefined);
        }
      } else {
        setSelectedRestaurant(null);
        popup.setPosition(undefined);
      }
    });

    setMap(newMap);

    return () => {
      newMap.setTarget(undefined);
    };
  }, [selectedLayer, restaurants, userLocation]);

  const addMarkersToMap = () => {
    vectorSourceRef.current.clear();

    const restaurantsToShow = showNearbyRadius ? nearbyRestaurants : restaurants;

    restaurantsToShow.forEach(restaurant => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([restaurant.longitude, restaurant.latitude])),
        restaurant: restaurant
      });

      feature.setStyle(new Style({
        image: new Icon({
          src: 'https://cdn.jsdelivr.net/npm/lucide-static@0.344.0/icons/utensils.svg',
          scale: 1.0,
          opacity: 0.8
        })
      }));

      vectorSourceRef.current.addFeature(feature);
    });

    if (userLocation) {
      const userFeature = new Feature({
        geometry: new Point(fromLonLat(userLocation))
      });

      userFeature.setStyle(new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: '#4c1d95' }),
          stroke: new Stroke({
            color: '#ffffff',
            width: 2
          })
        })
      }));

      vectorSourceRef.current.addFeature(userFeature);
    }
  };

  useEffect(() => {
    addMarkersToMap();
  }, [nearbyRestaurants, showNearbyRadius]);

const handleNavigate = () => {
  if (!selectedRestaurant) return;

  const destination = `${selectedRestaurant.latitude},${selectedRestaurant.longitude}`;
  const mode = travelMode.toLowerCase(); // Ensure lowercase for Google Maps compatibility

  if (userLocation) {
    const origin = `${userLocation[1]},${userLocation[0]}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${mode}`;
    window.location.href = url; // This directly opens the URL in the same tab
  } else {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin = `${position.coords.latitude},${position.coords.longitude}`;
        const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${mode}`;
        window.location.href = url;
      },
      (error) => {
        console.error('Error getting location:', error);
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=${mode}`;
        window.location.href = url;
      }
    );
  }
};

  // Render star rating display
  const renderStarRating = (rating: number | null | undefined) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center mt-1">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
          />
        ))}
        <span className="ml-1 text-sm">{rating}/5</span>
      </div>
    );
  };

  return (
    <div className="h-screen flex">
      <div className="w-64 bg-white shadow-lg z-10 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4">Restaurant Map</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Map Type
              </label>
              <select
                value={selectedLayer}
                onChange={(e) => setSelectedLayer(e.target.value)}
                className="w-full p-2 border rounded"
              >
                {Object.values(LAYER_TYPES).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <button
                onClick={() => showNearbyRadius ? clearNearbyRadius() : fetchNearbyRestaurants()}
                className={`w-full flex items-center justify-center px-4 py-2 rounded-md ${
                  showNearbyRadius
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } text-white transition-colors`}
              >
                <Utensils className="h-5 w-5 mr-2" />
                {showNearbyRadius ? 'Clear Nearby' : 'Show Nearby (5km)'}
              </button>
            </div>

            {nearbyRestaurants.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Nearby Restaurants</h3>
                <div className="space-y-2">
                  {nearbyRestaurants.map(restaurant => (
                    <div
                      key={restaurant.id}
                      className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        if (map) {
                          const coords = fromLonLat([restaurant.longitude, restaurant.latitude]);
                          map.getView().animate({
                            center: coords,
                            zoom: 17,
                            duration: 1000
                          });
                          setSelectedRestaurant(restaurant);
                        }
                      }}
                    >
                      <div className="font-medium">{restaurant.name}</div>
                      <div className="text-sm text-gray-600">
                        {restaurant.distance_km?.toFixed(1)} km away
                      </div>
                      <div className="text-sm text-gray-500">{restaurant.cuisine_type}</div>
                      {restaurant.rating && (
                        <div className="flex items-center text-sm mt-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 mr-1" />
                          <span>{restaurant.rating}/5</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {clickedCoords && (
              <div className="p-2 bg-gray-50 rounded">
                <h3 className="font-semibold mb-2">Clicked Location</h3>
                <p className="text-sm">Lat: {clickedCoords[0].toFixed(6)}</p>
                <p className="text-sm">Lon: {clickedCoords[1].toFixed(6)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-grow relative">
        <div ref={mapRef} className="absolute inset-0">
          {/* Map will be rendered here */}
        </div>

        <div className="absolute top-4 left-4 z-10 w-64">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search restaurants..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="absolute bottom-8 right-4 z-10">
          <button
            onClick={() => {
              if (userLocation && map) {
                map.getView().animate({
                  center: fromLonLat(userLocation),
                  zoom: 15,
                  duration: 1000
                });
              }
            }}
            className="bg-white p-3 rounded-full shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Go to my location"
          >
            <Crosshair className="h-6 w-6 text-indigo-600" />
          </button>
        </div>

        <div ref={popupRef} className="absolute z-10">
          {selectedRestaurant && (
            <div className="bg-white rounded-lg shadow-lg p-4 min-w-[300px]">
              <h3 className="font-bold text-lg mb-2">{selectedRestaurant.name}</h3>
              {renderStarRating(selectedRestaurant.rating)}
              <p className="text-gray-600 mb-2">{selectedRestaurant.description}</p>
              <div className="space-y-1">
                <p><strong>Address:</strong> {selectedRestaurant.address}</p>
                <p><strong>Phone:</strong> {selectedRestaurant.phone}</p>
                <p><strong>Cuisine:</strong> {selectedRestaurant.cuisine_type}</p>
                <p><strong>Hours:</strong> {selectedRestaurant.opening_hours}</p>
                {selectedRestaurant.distance_km && (
                  <p><strong>Distance:</strong> {selectedRestaurant.distance_km.toFixed(1)} km</p>
                )}
              </div>
              <div className="mt-4 flex items-center space-x-2">
                <select
                  value={travelMode}
                  onChange={(e) => setTravelMode(e.target.value as 'WALKING' | 'DRIVING')}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="DRIVING">Driving</option>
                  <option value="WALKING">Walking</option>
                </select>
                <button
                  onClick={handleNavigate}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
                >
                  <Navigation className="h-5 w-5 mr-2" />
                  Navigate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}