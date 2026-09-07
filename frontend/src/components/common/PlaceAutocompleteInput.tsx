import React, { useState, useEffect, useRef } from 'react';
import { searchLocation, getExactCoordinates, GeocodeResult } from '../../services/geocoding';
import { MapPin, Search, Loader2, CheckCircle2, AlertTriangle, X, Compass } from 'lucide-react';

interface PlaceAutocompleteInputProps {
  value: string;
  latitude?: number;
  longitude?: number;
  placeholder?: string;
  onChange: (place: { name: string; address?: string; latitude: number; longitude: number }) => void;
  required?: boolean;
  className?: string;
  showCoordinatesBadge?: boolean;
}

export const PlaceAutocompleteInput: React.FC<PlaceAutocompleteInputProps> = ({
  value,
  latitude,
  longitude,
  placeholder = 'Search bus stop / place (e.g. Machilipatnam Bus Stand, Pedana...)',
  onChange,
  required = false,
  className = '',
  showCoordinatesBadge = true,
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    address?: string;
    latitude: number;
    longitude: number;
  } | null>(
    latitude && longitude ? { name: value, latitude, longitude } : null
  );

  const debounceTimer = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value || '');
    if (latitude && longitude) {
      setSelectedPlace({ name: value, latitude, longitude });
    }
  }, [value, latitude, longitude]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

        // Auto-resolve best match if high-confidence regional match
        if (results.length > 0 && results[0].isVerified) {
          const best = results[0];
          setSelectedPlace(best);
          onChange({
            name: text.trim(),
            address: best.address,
            latitude: best.latitude,
            longitude: best.longitude,
          });
        }
      }, 250);
    } else {
      setSuggestions([]);
      setLoading(false);
      setIsOpen(false);
    }
  };

  const handleSelect = (item: GeocodeResult) => {
    setInputValue(item.name);
    setSelectedPlace(item);
    setIsOpen(false);
    onChange({
      name: item.name,
      address: item.address,
      latitude: item.latitude,
      longitude: item.longitude,
    });
  };

  // On blur, auto-resolve if no item was explicitly clicked
  const handleBlur = async () => {
    setTimeout(async () => {
      if (inputValue.trim().length >= 2 && (!selectedPlace || selectedPlace.name !== inputValue)) {
        const match = await getExactCoordinates(inputValue);
        if (match) {
          setSelectedPlace(match);
          onChange({
            name: inputValue.trim(),
            address: match.address,
            latitude: match.latitude,
            longitude: match.longitude,
          });
        }
      }
    }, 200);
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <MapPin className="w-4 h-4 text-cyan-500 shrink-0" />
        </div>

        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-8 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-500 shadow-inner"
        />

        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          ) : inputValue ? (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                setSelectedPlace(null);
                setSuggestions([]);
              }}
              className="text-slate-400 hover:text-white p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Search className="w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto backdrop-blur-xl animate-fadeIn">
          <div className="p-1.5 space-y-1">
            <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
              <span>Verified Bus Stops & Locations</span>
              <span className="text-cyan-400">Auto GPS</span>
            </div>
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left p-2 rounded-xl hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 group"
              >
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors truncate">
                      {item.name}
                    </span>
                    {item.isVerified && (
                      <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30 shrink-0">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                    {item.address}
                  </p>
                  <div className="text-[9px] font-mono text-cyan-300/80 mt-0.5">
                    GPS: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Verified Coordinates Pill Badge */}
      {showCoordinatesBadge && selectedPlace && selectedPlace.latitude && selectedPlace.longitude && (
        <div className="mt-1 flex items-center justify-between gap-1 text-[10px] px-2 py-0.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-emerald-300 font-mono">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="font-bold font-sans text-white text-[10px] truncate max-w-[140px]">
              {selectedPlace.name || 'Selected Stop'}
            </span>
          </div>
          <span>
            {selectedPlace.latitude.toFixed(4)}, {selectedPlace.longitude.toFixed(4)}
          </span>
        </div>
      )}
    </div>
  );
};
