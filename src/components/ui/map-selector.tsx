'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
type LatLngExpression = [number, number];

// Fix Leaflet icon issue in Next.js
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapClickHandlerProps {
  onLocationChange: (location: string) => void;
  initialPosition?: LatLngExpression;
  radius?: number;
}

// Component to handle map clicks and update position
function MapClickHandler({ onLocationChange, initialPosition, radius }: MapClickHandlerProps) {
  const [position, setPosition] = useState<LatLngExpression | undefined>(initialPosition);

  const map = useMapEvents({
    click: (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const newPosition: LatLngExpression = [lat, lng];
      setPosition(newPosition);
      onLocationChange(`${lat.toFixed(6)},${lng.toFixed(6)}`);
    }
  });

  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
      
      // Calculate appropriate zoom level based on radius if provided
      if (radius && radius > 0) {
        // Adjust zoom level to fit the circle
        const zoomLevel = radius > 500 ? 12 : 
                          radius > 200 ? 13 : 
                          radius > 100 ? 14 : 
                          radius > 50 ? 15 : 16;
        map.flyTo(initialPosition, zoomLevel);
      } else {
        map.flyTo(initialPosition, map.getZoom());
      }
    }
  }, [initialPosition, radius, map]);

  return position ? (
    <>
      <Marker 
        position={position} 
        icon={icon} 
      />
      {radius && radius > 0 && position && (
        <Circle 
          center={position}
          radius={radius} 
          pathOptions={{
            fillColor: '#4299e1', // blue-500
            fillOpacity: 0.15,
            color: '#3182ce', // blue-600
            weight: 2,
          }}
        />
      )}
    </>
  ) : null;
}

interface GeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface MapSelectorProps {
  value: string;
  onChange: (location: string) => void;
  radius?: number;
  className?: string;
}

// Map Control to handle search and zooming to location
function SearchControl({ onLocationChange }: { onLocationChange: (location: string) => void }) {
  const map = useMap();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setIsSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchTerm
        )}&limit=5`
      );
      
      if (!response.ok) throw new Error('Failed to fetch location data');
      
      const results: GeocodingResult[] = await response.json();
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching for location:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleSelectLocation = (result: GeocodingResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      map.flyTo([lat, lng], 14);
      onLocationChange(`${lat.toFixed(6)},${lng.toFixed(6)}`);
      setSearchTerm(result.display_name.split(',')[0]);
      setShowResults(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set debounce for search
    if (value.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch();
      }, 500) as unknown as NodeJS.Timeout;
    } else {
      setShowResults(false);
    }
  };
  
  return (
    <div className="absolute top-3 right-3 z-[1000] w-64">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder="Search for a location..."
          className="w-full px-3 py-2 bg-neutral-900/90 border border-neutral-700 rounded-md text-white placeholder-neutral-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        {isSearching && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        )}
        
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-neutral-900 border border-neutral-700 rounded-md shadow-lg z-50">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => handleSelectLocation(result)}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-neutral-800 transition-colors border-b border-neutral-800 last:border-0"
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MapSelector({ value, onChange, radius, className = '' }: MapSelectorProps) {
  // Parse initial coordinates from value string (format: "lat,lng")
  const [initialPosition, setInitialPosition] = useState<LatLngExpression | undefined>(undefined);

  useEffect(() => {
    if (value) {
      const [lat, lng] = value.split(',').map(parseFloat);
      if (!isNaN(lat) && !isNaN(lng)) {
        setInitialPosition([lat, lng]);
      }
    }
  }, [value]);

  // Default to San Francisco if no coordinates provided
  const defaultPosition: LatLngExpression = [37.7749, -122.4194];
  
  return (
    <div className={`h-72 w-full rounded-md overflow-hidden border border-neutral-800 relative ${className}`}>
      <MapContainer
        center={initialPosition || defaultPosition}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <SearchControl onLocationChange={onChange} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="dark-map-tiles"
        />
        <MapClickHandler 
          onLocationChange={onChange} 
          initialPosition={initialPosition}
          radius={radius}
        />
      </MapContainer>
    </div>
  );
}
