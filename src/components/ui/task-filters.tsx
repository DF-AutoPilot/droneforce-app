'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface TaskFiltersProps {
  onFilterChange: (filters: FilterCriteria) => void;
}

export interface FilterCriteria {
  status: string;
  radius: number;
  minPrice: number;
  maxPrice: number;
  useCurrentLocation: boolean;
}

export function TaskFilters({ onFilterChange }: TaskFiltersProps) {
  const [filters, setFilters] = useState<FilterCriteria>({
    status: 'all',
    radius: 0,
    minPrice: 0,
    maxPrice: 100,
    useCurrentLocation: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState('');
  
  useEffect(() => {
    // Let parent component know about filter changes
    onFilterChange(filters);
  }, [filters, onFilterChange]);
  
  const handleStatusChange = (status: string) => {
    setFilters(prev => ({ ...prev, status }));
  };
  
  const handleRadiusChange = (value: number[]) => {
    setFilters(prev => ({ ...prev, radius: value[0] }));
  };
  
  const handlePriceChange = (value: number[]) => {
    setFilters(prev => ({ ...prev, minPrice: value[0], maxPrice: value[1] }));
  };
  
  const handleUseLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const useLocation = e.target.checked;
    setFilters(prev => ({ ...prev, useCurrentLocation: useLocation }));
    
    if (useLocation && !userLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            setUserLocation([position.coords.latitude, position.coords.longitude]);
            setLocationError('');
          },
          error => {
            console.error('Error getting location:', error);
            setLocationError('Could not access your location. Please check browser permissions.');
            setFilters(prev => ({ ...prev, useCurrentLocation: false }));
          }
        );
      } else {
        setLocationError('Geolocation is not supported by your browser.');
        setFilters(prev => ({ ...prev, useCurrentLocation: false }));
      }
    }
  };
  
  const resetFilters = () => {
    setFilters({
      status: 'all',
      radius: 0,
      minPrice: 0,
      maxPrice: 100,
      useCurrentLocation: false,
    });
  };
  
  return (
    <div className="mb-4 space-y-4">
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="text-neutral-400 hover:text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800"
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
        
        {showFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-neutral-400 hover:text-neutral-300"
          >
            Reset
          </Button>
        )}
      </div>
      
      {showFilters && (
        <div className="space-y-6 p-5 bg-neutral-900 rounded-md border border-neutral-800 shadow-md">
          {/* Status Filter */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-neutral-300">Status</h3>
            <div className="flex flex-wrap gap-2">
              {['all', 'created', 'accepted', 'completed', 'verified'].map(status => (
                <Button
                  key={status}
                  variant={filters.status === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange(status)}
                  className={
                    filters.status === status 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                  }
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Location Filter */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-neutral-300">Distance from Current Location</h3>
              <div className="flex items-center">
                <input
                  id="use-location"
                  type="checkbox"
                  checked={filters.useCurrentLocation}
                  onChange={handleUseLocationChange}
                  className="h-4 w-4 rounded border-neutral-700 text-blue-600 focus:ring-blue-600"
                />
                <label htmlFor="use-location" className="ml-2 text-sm text-neutral-400">
                  Use my location
                </label>
              </div>
            </div>
            
            {locationError && (
              <p className="text-xs text-red-500 mt-1">{locationError}</p>
            )}
            
            <div className="py-6 px-2">
              <Slider
                disabled={!filters.useCurrentLocation}
                value={[filters.radius]}
                min={0}
                max={100}
                step={1}
                onValueChange={handleRadiusChange}
                className={!filters.useCurrentLocation ? 'opacity-50' : ''}
              />
            </div>
            
            <div className="flex justify-between text-xs text-neutral-400">
              <span>{filters.radius === 0 ? 'Any distance' : `${filters.radius} km radius`}</span>
              {filters.radius > 0 && <span>{filters.radius} km</span>}
            </div>
          </div>
          
          {/* Price Range Filter */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-neutral-300">Price Range</h3>
            
            <div className="py-6 px-2">
              <Slider
                value={[filters.minPrice, filters.maxPrice]}
                min={0}
                max={100}
                step={1}
                onValueChange={handlePriceChange}
              />
            </div>
            
            <div className="flex justify-between text-xs text-neutral-400">
              <span>{filters.minPrice} SOL</span>
              <span>{filters.maxPrice === 100 ? '100+ SOL' : `${filters.maxPrice} SOL`}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
