const SERVICES = {
  auth: { url: import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8081', label: 'Auth service' },
  fleet: { url: import.meta.env.VITE_FLEET_API_URL || 'http://localhost:8082', label: 'Fleet service' },
  trip: { url: import.meta.env.VITE_TRIP_API_URL || 'http://localhost:8083', label: 'Trip service' },
  occupancy: { url: import.meta.env.VITE_OCCUPANCY_API_URL || 'http://localhost:8084', label: 'Occupancy service' },
};

export const TOKEN_KEY = 'campusvolt_token';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const STATUS_MESSAGES = {
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'The requested record was not found.',
  503: 'A required service is unavailable.',
};

async function request(service, path, { method = 'GET', body } = {}) {
  const { url, label } = SERVICES[service];
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(`${label} is unreachable. Check that it is running.`, 0);
  }

  if (response.status === 401 && token) {
    window.dispatchEvent(new Event('campusvolt:unauthorized'));
  }
  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.message || STATUS_MESSAGES[response.status] || `Request failed (${response.status})`, response.status);
  }
  return data;
}

export const authApi = {
  login: (credentials) => request('auth', '/api/auth/login', { method: 'POST', body: credentials }),
  register: (details) => request('auth', '/api/auth/register', { method: 'POST', body: details }),
  me: () => request('auth', '/api/auth/me'),
};

export const fleetApi = {
  vehicles: () => request('fleet', '/api/vehicles'),
  createVehicle: (vehicle) => request('fleet', '/api/vehicles', { method: 'POST', body: vehicle }),
  updateVehicle: (id, vehicle) => request('fleet', `/api/vehicles/${id}`, { method: 'PUT', body: vehicle }),
  deleteVehicle: (id) => request('fleet', `/api/vehicles/${id}`, { method: 'DELETE' }),
  routes: () => request('fleet', '/api/routes'),
  createRoute: (route) => request('fleet', '/api/routes', { method: 'POST', body: route }),
  updateRoute: (id, route) => request('fleet', `/api/routes/${id}`, { method: 'PUT', body: route }),
  deleteRoute: (id) => request('fleet', `/api/routes/${id}`, { method: 'DELETE' }),
};

export const tripApi = {
  trips: () => request('trip', '/api/trips'),
  createTrip: (trip) => request('trip', '/api/trips', { method: 'POST', body: trip }),
  updateTrip: (id, changes) => request('trip', `/api/trips/${id}`, { method: 'PUT', body: changes }),
  tracking: () => request('trip', '/api/tracking/vehicles'),
};

export const occupancyApi = {
  list: () => request('occupancy', '/api/occupancy'),
  update: (vehicleId, passengerCount) =>
    request('occupancy', `/api/occupancy/${vehicleId}`, { method: 'PUT', body: { passengerCount } }),
  alerts: (includeResolved = false) => request('occupancy', `/api/alerts?includeResolved=${includeResolved}`),
};
