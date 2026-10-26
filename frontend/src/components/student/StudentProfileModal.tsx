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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-xl w-full p-6 sm:p-8 shadow-xl space-y-5 my-6 relative border border-slate-200 dark:border-slate-700">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Student Profile & Boarding Stop
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Configure your exact pickup location for 2 km proximity alerts and live bus ETAs.
            </p>
          </div>
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-200 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!isEditing ? (
          /* View Mode */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Student Name
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                  {user?.name}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Roll Number
                </span>
                <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400 mt-0.5 block">
                  {student.rollNumber}
                </span>
              </div>
            </div>

            {/* Boarding Point Highlight Box */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Your Boarding Stop
                </span>
                <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md">
                  2 KM Alert Anchor
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {student.boardingPoint?.name || 'Not Configured'}
              </h3>

              {student.boardingPoint && (
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  GPS: {student.boardingPoint.latitude.toFixed(5)}, {student.boardingPoint.longitude.toFixed(5)}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Edit2 className="w-4 h-4" />
              <span>Change Stop Location / Pin on Map</span>
            </button>
          </div>
        ) : (
          /* Edit Mode */
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Village / Area
                </label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Boarding Point Search & Map */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Stop / Hostel Name
                </label>
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={detectingGps}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
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
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 pr-9 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400"
                  required
                />
                <div className="absolute right-3 top-2.5 text-slate-400">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Search className="w-4 h-4" />}
                </div>

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(s)}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-900 dark:text-white transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium truncate">{s.displayName}</span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">
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
                    className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {chip.name.split(',')[0]}
                  </button>
                ))}
              </div>

              {/* Map Pin-Dropper */}
              <div className="h-44 sm:h-52 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
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

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Coordinates</span>
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
