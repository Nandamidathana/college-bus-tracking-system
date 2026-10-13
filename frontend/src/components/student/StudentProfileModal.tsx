import React, { useState, useEffect, useRef } from 'react';
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
  Search,
  Loader2,
  Map as MapIcon,
} from 'lucide-react';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

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
          📍 Selected Boarding Stop<br />
          <span className="text-[10px] text-slate-500 font-mono">
            {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </span>
          <p className="text-[9px] text-brand-600 mt-1 font-normal">(Drag or click to move)</p>
        </div>
      </Popup>
    </Marker>
  );
};

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
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimerRef = useRef<any>(null);

  const [detectingGps, setDetectingGps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (student) {
      setName(user?.name || '');
      setVillage(student.village || '');
      setBoardingPointName(student.boardingPoint?.name || '');
      setLatitude(student.boardingPoint?.latitude || 16.3496);
      setLongitude(student.boardingPoint?.longitude || 81.0498);
    }
  }, [student, user, isOpen]);

  const handleLocationInputChange = (text: string) => {
    setBoardingPointName(text);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (text.toLowerCase().includes('himaja')) {
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

  const handleMapPositionChange = async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);

    try {
      const address = await reverseGeocode(lat, lng);
      if (address && (!boardingPointName || boardingPointName.includes('My Live Location') || boardingPointName.includes('GPS'))) {
        const shortName = address.split(',')[0];
        setBoardingPointName(shortName);
      }
    } catch {
      // ignore
    }
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your device.');
      return;
    }

    setDetectingGps(true);
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);

        const address = await reverseGeocode(lat, lng);
        if (address) {
          setBoardingPointName(address.split(',')[0]);
        }
        setDetectingGps(false);
        setSuccessMsg(`GPS position locked (±${Math.round(pos.coords.accuracy || 5)}m)!`);
        setTimeout(() => setSuccessMsg(''), 4000);
      },
      (err) => {
        console.warn('GPS detection error:', err);
        setErrorMsg('Could not acquire device GPS. Please verify location permissions.');
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setSaving(true);

    const bpName = boardingPointName.trim() || 'Gudivada Bus Stand';
    let finalLat = parseFloat(String(latitude));
    let finalLng = parseFloat(String(longitude));

    if (isNaN(finalLat) || isNaN(finalLng)) {
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
        setSuccessMsg('📍 Exact boarding location saved successfully!');
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="water-glass rounded-3xl sm:rounded-4xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 my-6 relative border border-white/80">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 pr-8">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-pastel-yellow shadow-pill-teal shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-pastel-darkText dark:text-white tracking-tight">
              Student Profile & Boarding Stop
            </h2>
            <p className="text-xs subtext-muted font-semibold">
              Configure your exact pickup location for 2km push alerts and accurate bus ETAs.
            </p>
          </div>
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-900 dark:text-emerald-100 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-500/20 border border-red-500/50 text-red-900 dark:text-red-100 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-300 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!isEditing ? (
          /* View Mode */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider subtext-muted block">
                  Student Name
                </span>
                <span className="text-sm sm:text-base font-black text-pastel-darkText dark:text-white mt-0.5 block truncate">
                  {user?.name}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider subtext-muted block">
                  Roll Number
                </span>
                <span className="text-sm sm:text-base font-mono font-bold text-brand-700 dark:text-pastel-softTeal mt-0.5 block">
                  {student.rollNumber}
                </span>
              </div>
            </div>

            {/* Boarding Point Highlight Box */}
            <div className="p-5 rounded-3xl bg-pastel-cream/70 dark:bg-brand-900/40 border border-amber-300 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-pastel-yellow flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  Your Boarding Stop
                </span>
                <span className="text-[10px] font-black bg-pastel-yellow text-pastel-darkText px-2 py-0.5 rounded-full">
                  2 KM Alert Anchor
                </span>
              </div>

              <h4 className="text-lg font-black text-pastel-darkText dark:text-white">
                {student.boardingPoint?.name || 'Not Configured'}
              </h4>

              {student.boardingPoint && (
                <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  GPS: {student.boardingPoint.latitude.toFixed(5)}, {student.boardingPoint.longitude.toFixed(5)}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="btn-pill-primary w-full gap-2 text-sm"
            >
              <Edit2 className="w-4 h-4" />
              Change Stop Location / Pin on Map
            </button>
          </div>
        ) : (
          /* Edit Mode */
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider subtext-muted mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full water-glass-input rounded-xl px-3.5 py-2 text-sm font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider subtext-muted mb-1">
                  Village / Area
                </label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full water-glass-input rounded-xl px-3.5 py-2 text-sm font-bold"
                  required
                />
              </div>
            </div>

            {/* Boarding Point Search & Map */}
            <div className="p-4 rounded-3xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase tracking-wider text-brand-700 dark:text-pastel-softTeal flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Stop / Hostel Name
                </label>
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={detectingGps}
                  className="text-[11px] font-bold bg-pastel-mint text-brand-900 border border-brand-400 px-2.5 py-1 rounded-full flex items-center gap-1"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  {detectingGps ? 'Locating...' : 'Use Device GPS'}
                </button>
              </div>

              {/* Autocomplete Input */}
              <div className="relative">
                <input
                  type="text"
                  value={boardingPointName}
                  onChange={(e) => handleLocationInputChange(e.target.value)}
                  placeholder="Type any place (e.g. Himaja Boys Hostel, Gudivada)..."
                  className="w-full water-glass-input rounded-xl px-3.5 py-2.5 pr-10 text-sm font-bold"
                  required
                />
                <div className="absolute right-3 top-3 text-slate-400">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-brand-600" /> : <Search className="w-4 h-4" />}
                </div>

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white dark:bg-brand-900 border border-black/10 dark:border-white/15 rounded-xl shadow-2xl overflow-hidden max-h-44 overflow-y-auto divide-y divide-black/5 dark:divide-white/10">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(s)}
                        className="w-full text-left px-3.5 py-2 hover:bg-pastel-mint/50 text-xs text-pastel-darkText dark:text-white transition-colors flex items-center justify-between"
                      >
                        <span className="font-semibold truncate">{s.displayName}</span>
                        <span className="text-[10px] font-mono text-brand-600 shrink-0 ml-2">
                          {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Preset Stops */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {POPULAR_AP_STOPS.slice(0, 5).map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickChipSelect(chip)}
                    className="text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:bg-pastel-mint text-pastel-darkText dark:text-white transition-colors"
                  >
                    {chip.name.split(',')[0]}
                  </button>
                ))}
              </div>

              {/* Map Pin-Dropper */}
              <div className="h-44 sm:h-52 w-full rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-inner">
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
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn-pill-secondary flex-1 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-pill-primary flex-1 text-xs gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Coordinates
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
