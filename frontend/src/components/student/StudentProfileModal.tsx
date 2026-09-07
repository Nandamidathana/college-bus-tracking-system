import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';
import { searchLocation, reverseGeocode, getExactCoordinates, GeocodeResult } from '../../services/geocoding';
import {
  User,
  School,
  MapPin,
  Route as RouteIcon,
  Compass,
  Edit2,
  Save,
  X,
  Crosshair,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  Navigation,
  Loader2,
  Map as MapIcon,
  Check,
} from 'lucide-react';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

// Preset Stops with Exact Coordinates (including Himaja Boys Hostel at red mark 16.3496, 81.0498)
const POPULAR_AP_STOPS = [
  { name: 'Himaja Boys Hostel, Gudlavalleru', lat: 16.3496, lng: 81.0498 },
  { name: 'Gudlavalleru College Road / Hostels', lat: 16.3488, lng: 81.0478 },
  { name: 'Gudlavalleru Bus Stand', lat: 16.3476, lng: 81.0534 },
  { name: 'Gudivada Bus Stand', lat: 16.4321, lng: 80.9976 },
  { name: 'Vijayawada (Benz Circle)', lat: 16.4975, lng: 80.6515 },
  { name: 'Vijayawada (PNBS Station)', lat: 16.5165, lng: 80.6186 },
  { name: 'Pamarru Center', lat: 16.3315, lng: 80.9634 },
  { name: 'Vuyyuru Center', lat: 16.3688, lng: 80.8431 },
  { name: 'Machilipatnam Bus Stand', lat: 16.1875, lng: 81.1389 },
];

// Interactive Click-to-Pin component for Leaflet
const MapLocationPicker: React.FC<{
  position: [number, number];
  onPositionSelected: (lat: number, lng: number) => void;
}> = ({ position, onPositionSelected }) => {
  const map = useMap();

  useMapEvents({
    click(e) {
      onPositionSelected(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
      map.panTo(e.latlng);
    },
  });

  return (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const latLng = marker.getLatLng();
          onPositionSelected(Number(latLng.lat.toFixed(6)), Number(latLng.lng.toFixed(6)));
        },
      }}
    >
      <Popup>
        <div className="text-xs p-1 font-bold text-center">
          📍 Selected Boarding Point<br />
          <span className="text-[10px] text-slate-400 font-mono">
            {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </span>
          <p className="text-[9px] text-cyan-400 mt-1 font-normal">(Drag or click map to move)</p>
        </div>
      </Popup>
    </Marker>
  );
};

// Auto-Pan to new position
const MapPanTo: React.FC<{ position: [number, number] }> = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position[0], position[1]]);
  return null;
};

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const { user, refreshUser } = useAuth();
  const student = user?.student;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [boardingPointName, setBoardingPointName] = useState('');
  const [latitude, setLatitude] = useState<number | string>(16.3496);
  const [longitude, setLongitude] = useState<number | string>(81.0498);

  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    if (user && student) {
      setName(user.name || '');
      setVillage(student.village || '');
      if (student.boardingPoint) {
        setBoardingPointName(student.boardingPoint.name);
        setLatitude(student.boardingPoint.latitude);
        setLongitude(student.boardingPoint.longitude);
      }
    }
  }, [user, student, isOpen]);

  // Handle typing geocode search
  const handleLocationInputChange = (text: string) => {
    setBoardingPointName(text);
    setErrorMsg('');

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (text.trim().toLowerCase().includes('himaja')) {
      // Direct preset for Himaja Boys Hostel at exact coordinates
      setLatitude(16.3496);
      setLongitude(81.0498);
      return;
    }

    if (text.trim().length >= 2) {
      setIsSearching(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const results = await searchLocation(text);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);

          if (results.length > 0) {
            setLatitude(results[0].latitude);
            setLongitude(results[0].longitude);
          } else {
            const match = POPULAR_AP_STOPS.find((p) =>
              p.name.toLowerCase().includes(text.toLowerCase())
            );
            if (match) {
              setLatitude(match.lat);
              setLongitude(match.lng);
            }
          }
        } catch (e) {
          console.warn('Geocoding debounce error:', e);
        } finally {
          setIsSearching(false);
        }
      }, 350);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (s: GeocodeResult) => {
    setBoardingPointName(s.name);
    setLatitude(s.latitude);
    setLongitude(s.longitude);
    setShowSuggestions(false);
  };

  const handleQuickChipSelect = (chip: { name: string; lat: number; lng: number }) => {
    setBoardingPointName(chip.name);
    setLatitude(chip.lat);
    setLongitude(chip.lng);
    setShowSuggestions(false);
  };

  // Map click/drag position handler
  const handleMapPositionChange = async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);

    // If name is default or we want address preview
    try {
      const address = await reverseGeocode(lat, lng);
      if (address && (!boardingPointName || boardingPointName.includes('My Live Location') || boardingPointName.includes('GPS'))) {
        const shortName = address.split(',')[0];
        setBoardingPointName(shortName);
      }
    } catch (e) {
      // ignore
    }
  };

  // Auto-Detect Live Device GPS with Multi-Sample Satellite Lock
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your device/browser.');
      return;
    }

    setDetectingGps(true);
    setErrorMsg('');

    let bestFix: { latitude: number; longitude: number; accuracy: number } | null = null;
    let samples = 0;
    let isFinished = false;

    const finishWithFix = async (fix: { latitude: number; longitude: number; accuracy: number } | null) => {
      if (isFinished) return;
      isFinished = true;
      if (fix) {
        setLatitude(Number(fix.latitude.toFixed(6)));
        setLongitude(Number(fix.longitude.toFixed(6)));

        const address = await reverseGeocode(fix.latitude, fix.longitude);
        if (address) {
          const shortName = address.split(',')[0];
          setBoardingPointName(shortName);
        } else if (!boardingPointName) {
          setBoardingPointName('Himaja Boys Hostel, Gudlavalleru');
        }

        setDetectingGps(false);
        setSuccessMsg(`High-precision GPS locked (±${Math.round(fix.accuracy)}m)!`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg('Could not acquire device GPS. Please verify high-accuracy location permissions.');
        setDetectingGps(false);
      }
    };

    const warmUpWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        samples++;
        const acc = pos.coords.accuracy || 50;
        if (!bestFix || acc < bestFix.accuracy) {
          bestFix = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: acc,
          };
        }

        if (acc <= 10 || samples >= 4) {
          navigator.geolocation.clearWatch(warmUpWatchId);
          finishWithFix(bestFix);
        }
      },
      (err) => {
        console.warn('GPS detection warning:', err);
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );

    setTimeout(() => {
      navigator.geolocation.clearWatch(warmUpWatchId);
      finishWithFix(bestFix);
    }, 2800);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const bpName = boardingPointName.trim() || 'Gudivada Bus Stand';
    let finalLat = parseFloat(String(latitude));
    let finalLng = parseFloat(String(longitude));

    if (isNaN(finalLat) || isNaN(finalLng) || (finalLat === 16.35 && finalLng === 80.62)) {
      const match = await getExactCoordinates(bpName);
      if (match) {
        finalLat = match.latitude;
        finalLng = match.longitude;
      } else {
        finalLat = 16.4321;
        finalLng = 80.9976;
      }
    }

    try {
      const payload: any = {
        name: name.trim(),
        village: village.trim(),
        boardingPointName: bpName,
        latitude: finalLat,
        longitude: finalLng,
      };

      const res = await studentApi.updateProfile(payload);
      if (res.data.success) {
        await refreshUser();
        setSuccessMsg('📍 Exact boarding location coordinates saved successfully!');
        setIsEditing(false);
        if (onProfileUpdated) onProfileUpdated();
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      console.error('Update profile error:', err);
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !student) return null;

  const currentCoords: [number, number] = [
    typeof latitude === 'number' && !isNaN(latitude) ? latitude : 16.3496,
    typeof longitude === 'number' && !isNaN(longitude) ? longitude : 81.0498,
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="water-glass rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-white/15"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/25 to-blue-600/35 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/20">
            <Compass className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight drop-shadow-sm">
              Student Profile & Boarding Stop
            </h2>
            <p className="text-xs text-slate-200">
              Set your exact boarding location or hostel on the map with pinpoint accuracy.
            </p>
          </div>
        </div>

        {/* Success / Error Messages */}
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-bold flex items-center gap-2 shadow-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!isEditing ? (
          /* View Mode */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                  Student Name
                </span>
                <span className="text-base font-extrabold text-white mt-0.5 block">
                  {user?.name}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                  Roll Number
                </span>
                <span className="text-base font-mono font-bold text-cyan-300 mt-0.5 block">
                  {student.rollNumber}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                College Institution
              </span>
              <span className="text-sm font-bold text-white block">
                {user?.college?.name || student.college?.name}
              </span>
              <span className="text-xs text-slate-300 block">
                {user?.college?.address || student.college?.address}
              </span>
            </div>

            {/* Boarding Point Highlight Box */}
            <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  Your Configured Boarding Stop
                </span>
                <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 px-2 py-0.5 rounded-full">
                  2 KM Alert Anchor
                </span>
              </div>

              <h4 className="text-lg font-black text-white">
                {student.boardingPoint?.name || 'Not Configured'}
              </h4>

              {student.boardingPoint && (
                <div className="text-xs text-slate-200 font-mono font-medium">
                  GPS: {student.boardingPoint.latitude.toFixed(5)}, {student.boardingPoint.longitude.toFixed(5)}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 transition-all text-sm"
            >
              <Edit2 className="w-4 h-4" />
              Change Location / Click Pin on Map
            </button>
          </div>
        ) : (
          /* Edit Mode Form with Interactive Pin-Drop Map */
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full water-glass-input text-white rounded-xl px-3.5 py-2.5 text-sm font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase mb-1">
                  Village / Area
                </label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full water-glass-input text-white rounded-xl px-3.5 py-2.5 text-sm font-bold"
                  required
                />
              </div>
            </div>

            {/* Boarding Point Custom Location & GPS Controls */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Boarding Stop / Hostel Name
                </label>
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={detectingGps}
                  className="text-xs font-bold bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-400/40 px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Crosshair className="w-3.5 h-3.5 animate-pulse" />
                  {detectingGps ? 'Locking GPS...' : 'Use My Live GPS'}
                </button>
              </div>

              {/* Location Input with Live Typeahead & Automatic Coordinates Update */}
              <div className="relative">
                <input
                  type="text"
                  value={boardingPointName}
                  onChange={(e) => handleLocationInputChange(e.target.value)}
                  placeholder="Type any place (e.g. Himaja Boys Hostel, Gudivada)..."
                  className="w-full water-glass-input text-white rounded-xl px-4 py-2.5 pr-10 text-sm font-bold focus:outline-none"
                  required
                />
                <div className="absolute right-3 top-3 text-slate-400">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : <Search className="w-4 h-4" />}
                </div>

                {/* Autocomplete Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-slate-900 border border-white/15 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-800">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(s)}
                        className="w-full text-left px-3.5 py-2 hover:bg-cyan-600/20 text-xs text-slate-200 transition-colors flex items-center justify-between"
                      >
                        <span className="font-semibold truncate">{s.displayName}</span>
                        <span className="text-[10px] text-cyan-300 font-mono shrink-0 ml-2">
                          {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick 1-Tap Popular Stops (Includes Himaja Boys Hostel) */}
              <div className="pt-1">
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block mb-1.5">
                  Popular Gudlavalleru Stops:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_AP_STOPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickChipSelect(chip)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                        (chip.name.includes('Himaja') && boardingPointName.includes('Himaja')) || boardingPointName === chip.name
                          ? 'bg-cyan-500 border-cyan-300 text-slate-950 font-black shadow-md shadow-cyan-500/25'
                          : 'bg-slate-900/80 border-white/10 text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {chip.name.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 🗺️ INTERACTIVE MAP PIN-DROPPER: Click or Drag anywhere to set exact location */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                    <MapIcon className="w-3.5 h-3.5" />
                    Interactive Map: Click Anywhere to Pinpoint
                  </span>
                  <span className="text-[10px] text-slate-300 font-mono">
                    {currentCoords[0].toFixed(5)}, {currentCoords[1].toFixed(5)}
                  </span>
                </div>

                <div className="h-44 w-full rounded-2xl overflow-hidden border border-white/15 shadow-inner">
                  <MapContainer
                    center={currentCoords}
                    zoom={16}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapLocationPicker
                      position={currentCoords}
                      onPositionSelected={handleMapPositionChange}
                    />
                    <MapPanTo position={currentCoords} />
                  </MapContainer>
                </div>
                <span className="text-[10px] text-slate-300 block mt-1">
                  💡 Tip: Click anywhere on the map or drag the blue marker to place your boarding point directly on your hostel.
                </span>
              </div>

              {/* Real-Time Updated Coordinates */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-white/10">
                  <label className="block text-[10px] font-bold text-slate-300 uppercase mb-0.5">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full bg-transparent text-emerald-400 font-mono text-xs font-bold focus:outline-none"
                    required
                  />
                </div>
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-white/10">
                  <label className="block text-[10px] font-bold text-slate-300 uppercase mb-0.5">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full bg-transparent text-emerald-400 font-mono text-xs font-bold focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-4 rounded-xl transition-colors border border-white/15 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 transition-all text-xs disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Boarding Point
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
