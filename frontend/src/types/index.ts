export interface College {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  address: string;
}

export interface BoardingPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  routeId: string;
  sequence: number;
}

export interface Route {
  id: string;
  name: string;
  routeNumber: string;
  collegeId: string;
  destinationCollegeId?: string;
  boardingPoints?: BoardingPoint[];
  buses?: Bus[];
  _count?: { students: number };
}

export interface LiveLocation {
  busId: string;
  tripId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: string;
  isStale: boolean;
}

export interface Bus {
  id: string;
  busNumber: string;
  capacity: number;
  collegeId: string;
  routeId?: string;
  assignedDriverId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  route?: Route;
  assignedDriver?: { id: string; driverName: string; phone?: string };
  driver?: { driverName: string; phone?: string };
  liveLocation?: LiveLocation | null;
  activeTrip?: Trip | null;
  trips?: Trip[];
}

export interface Driver {
  id: string;
  userId: string;
  driverName: string;
  phone?: string;
  collegeId: string;
  assignedBusId?: string;
  status: 'AVAILABLE' | 'ON_TRIP' | 'OFFLINE';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  assignedBus?: Bus | null;
  college?: College;
  activeTrip?: Trip | null;
  trips?: Trip[];
}

export interface Student {
  id: string;
  userId: string;
  rollNumber: string;
  village: string;
  boardingPointId: string;
  routeId: string;
  collegeId: string;
  user?: { name: string; email?: string; phone?: string };
  college?: College;
  route?: Route;
  boardingPoint?: BoardingPoint;
}

export interface Trip {
  id: string;
  busId: string;
  driverId: string;
  collegeId: string;
  startTime: string;
  endTime?: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  tripType?: 'MORNING_PICKUP' | 'EVENING_RETURN';
  originName?: string | null;
  destinationName?: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  finalStopId?: string | null;
  arrivalTime?: string | null;
  arrivalStatus?: string | null;
  delayMinutes?: number;
  isDelayedNotified?: boolean;
  bus?: Bus;
  driver?: Driver;
  notifications?: Notification[];
}

export interface Notification {
  id: string;
  studentId: string;
  tripId: string;
  type: string;
  message: string;
  sentAt: string;
  status: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'STUDENT' | 'DRIVER' | 'ADMIN';
  collegeId: string;
  college?: College;
  student?: Student;
  driver?: Driver;
}

export interface BusLocationUpdate {
  busId: string;
  busNumber: string;
  tripId: string;
  driverId?: string;
  driverName?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: string;
  isStale: boolean;
  status: 'LIVE' | 'APPROACHING' | 'NEARBY' | 'LOCATION_DELAYED' | 'OFFLINE';
  tripType?: 'MORNING_PICKUP' | 'EVENING_RETURN';
  originName?: string | null;
  destinationName?: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  nextStopName?: string | null;
  destinationDistance?: string | null;
}

export interface ProximityAlertPayload {
  type: 'APPROACHING_2KM';
  tripId: string;
  busId: string;
  busNumber: string;
  boardingPointName: string;
  distanceMeters: number;
  formattedDistance: string;
  message: string;
  timestamp: string;
}

export interface BusArrivalPayload {
  type: 'BUS_ARRIVED' | 'BUS_RETURN_COMPLETED';
  tripType: 'MORNING_PICKUP' | 'EVENING_RETURN';
  tripId: string;
  busId: string;
  busNumber: string;
  routeName: string;
  routeNumber: string;
  driverName: string;
  driverPhone?: string;
  arrivalTime?: string;
  completionTime?: string;
  reportingTime?: string;
  status?: string;
  delayMinutes?: number;
  distanceAtArrival?: number;
  destinationName?: string;
  message: string;
}
