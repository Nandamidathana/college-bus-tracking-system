import React, { useState, useEffect, useRef } from 'react';
import { searchLocation, reverseGeocode, getExactCoordinates, GeocodeResult } from '../../services/geocoding';
import { MapPin, Crosshair, Search, Loader2, Check } from 'lucide-react';

interface LocationInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  latitude: number | string;
  longitude: number | string;
  onChange: (name: string, lat: number, lng: number) => void;
  required?: boolean;
  className?: string;
  autoDetectOnMount?: boolean;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  label = 'Location / Address',
  placeholder = 'e.g. Gudivada Bus Stand or Gudlavalleru',
  value,
  latitude,
  longitude,
  onChange,
  required = false,
  className = '',
  autoDetectOnMount = false,
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearchingGPS, setIsSearchingGPS] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimer = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle typing search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (text.trim().length >= 2) {
      setLoading(true);
      debounceTimer.current = setTimeout(async () => {
        const results = await searchLocation(text);
        setSuggestions(results);
        setLoading(false);
        setIsOpen(results.length > 0);

        // Auto-select best match coordinates if found
        if (results.length > 0) {
          const best = results[0];
          onChange(text, best.latitude, best.longitude);
        }
      }, 250);
    } else {
      setSuggestions([]);
      setLoading(false);
      setIsOpen(false);
    }
  };

  const handleBlur = async () => {
    setTimeout(async () => {
      if (inputValue.trim().length >= 2) {
        const match = await getExactCoordinates(inputValue);
        if (match) {
          onChange(inputValue.trim(), match.latitude, match.longitude);
        }
      }
    }, 200);
  };

  // Select a suggestion
  const handleSelectSuggestion = (item: GeocodeResult) => {
    setInputValue(item.name);
    onChange(item.name, item.latitude, item.longitude);
    setIsOpen(false);
  };

  // Auto-Detect Device GPS
  const handleAutoDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsSearchingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));

        // Reverse geocode to find address name
        const address = await reverseGeocode(lat, lng);
        const locationName = address ? address.split(',')[0] : 'My Current GPS Location';

        setInputValue(locationName);
        onChange(locationName, lat, lng);
        setIsSearchingGPS(false);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        alert('Could not access device GPS. Please check location permissions.');
        setIsSearchingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className={`space-y-1.5 relative ${className}`} ref={wrapperRef}>
      <div className="flex items-center justify-between">
        {label && (
          <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            {label}
          </label>
        )}
        <button
          type="button"
          onClick={handleAutoDetectGPS}
          disabled={isSearchingGPS}
          className="text-[11px] font-bold bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
        >
          <Crosshair className={`w-3 h-3 ${isSearchingGPS ? 'animate-spin' : 'animate-pulse'}`} />
          {isSearchingGPS ? 'Detecting GPS...' : 'Auto-Detect My GPS'}
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 shadow-inner"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800 max-h-60 overflow-y-auto">
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full text-left p-3 hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 group"
              >
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">{item.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{item.displayName}</div>
                  <div className="text-[9px] text-blue-300/80 font-mono mt-0.5">
                    Lat: {item.latitude.toFixed(5)}, Lng: {item.longitude.toFixed(5)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Auto-populated coordinates badge */}
      {latitude !== '' && longitude !== '' && (
        <div className="flex items-center justify-between text-[11px] px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-300 font-mono">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <Check className="w-3 h-3" /> Coordinates Auto-Filled:
          </span>
          <span className="text-white font-bold">
            {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
          </span>
        </div>
      )}
    </div>
  );
};
