'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
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

// MapView component that handles marker and circle positioning
function MapView({ 
  position, 
  radius 
}: { 
  position: LatLngExpression;
  radius?: number;
}) {
  const map = useMap();
  
  useEffect(() => {
    // Calculate appropriate zoom level based on radius if provided
    if (radius && radius > 0) {
      // Adjust zoom level to fit the circle
      // Smaller radii need higher zoom levels (closer view)
      // This is a simple heuristic - you may need to adjust
      const zoomLevel = radius > 500 ? 12 : 
                        radius > 200 ? 13 : 
                        radius > 100 ? 14 : 
                        radius > 50 ? 15 : 16;
      map.flyTo(position, zoomLevel);
    } else {
      map.flyTo(position, map.getZoom());
    }
  }, [position, radius, map]);
  
  return (
    <>
      <Marker position={position} icon={icon} />
      {radius && radius > 0 && (
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
  );
}

interface LocationMapProps {
  coords: string; // Format: "lat,lng"
  radius?: number; // Radius in meters
  className?: string;
}

export function LocationMap({ coords, radius, className = '' }: LocationMapProps) {
  const [position, setPosition] = useState<LatLngExpression | undefined>(undefined);
  
  useEffect(() => {
    if (coords) {
      const [lat, lng] = coords.split(',').map(parseFloat);
      if (!isNaN(lat) && !isNaN(lng)) {
        setPosition([lat, lng]);
      }
    }
  }, [coords]);
  
  // Default to San Francisco if no coordinates provided
  const defaultPosition: LatLngExpression = [37.7749, -122.4194];
  
  return (
    <div className={`h-64 w-full rounded-md overflow-hidden border border-neutral-800 ${className}`}>
      <MapContainer
        center={position || defaultPosition}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="dark-map-tiles"
        />
        {position && <MapView position={position} radius={radius} />}
      </MapContainer>
    </div>
  );
}
