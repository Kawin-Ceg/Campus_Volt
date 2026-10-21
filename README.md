# CampusVolt — Smart Campus EV Fleet Intelligence System

CampusVolt is a full-stack web application for running a campus electric shuttle fleet. It is built from four Spring Boot microservices and a React dashboard, and it covers:

- vehicles and routes
- trips with simulated live tracking and ETA
- passenger occupancy with automatic operational alerts

> Built for the **Web Programming** course by Kawin A N (2024115018), Shankararam S U (2024115020) and Rohan Beniel E (2024115124).

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Team and ownership](#team-and-ownership)
- [Architecture](#architecture)
- [Business rules](#business-rules)
- [Getting started](#getting-started)
- [Frontend pages](#frontend-pages)
- [API summary](#api-summary)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)

---

## Features

- **Accounts and roles.** Users register and log in with JWT authentication. `ADMIN` accounts can make changes; `STUDENT` accounts can only view.
- **Fleet management.** Admins can create, edit and delete vehicles (registration, capacity, status, battery) and routes with ordered stops.
- **Route distance estimation.** If no distance is entered, it is calculated from the stop coordinates using the haversine formula and labelled "estimated".
- **Trips.** Admins schedule trips and move them through Scheduled → In progress → Completed / Cancelled. A vehicle can only run one trip at a time.
- **Simulated tracking.** Running vehicles move along their route every 5 seconds. Each trip shows its progress, speed and delay, plus an ETA with an explanation when the ETA can't be shown.
- **Occupancy.** Admins report passenger counts. Each vehicle gets a load level: Normal, Near capacity or Overcrowded.
- **Self-resolving alerts.** Overcrowding, Delay and Stale-tracking alerts open automatically and close themselves when the problem clears.
- **Consistent errors.** Every service returns `{ "message": "..." }` with a matching HTTP status.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Vite 5, plain CSS |
| Backend | Java 21, Spring Boot 3.5 (Web, Data JPA, Security, Validation) |
| Persistence | Hibernate (JPA), PostgreSQL, one database per service |
| Auth | BCrypt password hashing, JWT (JJWT 0.12, HMAC-SHA256) |
| Service calls | Spring `RestClient` (forwards the caller's JWT) |
| Build | Maven (each service), npm (frontend) |

## Team and ownership

| Part | Owner | Folder | Port |
|---|---|---|---|
| Fleet and Route Service | Kawin A N — 2024115018 | `backend/fleet-route-service` | 8082 |
| Trip and Tracking Service | Shankararam S U — 2024115020 | `backend/trip-tracking-service` | 8083 |
| Occupancy and Alert Service | Rohan Beniel E — 2024115124 | `backend/occupancy-alert-service` | 8084 |
| Auth Service (shared, coordinated by Kawin) | Kawin A N | `backend/auth-service` | 8081 |
| React frontend (shared) | Kawin A N | `frontend` | 5173 |

## Architecture

```
React (Vite, :5173)
   │  fetch + "Authorization: Bearer <JWT>"
   ├──► auth-service            :8081 ──► campusvolt_auth_db
   ├──► fleet-route-service     :8082 ──► campusvolt_fleet_db
   ├──► trip-tracking-service   :8083 ──► campusvolt_tracking_db
   │        └── calls fleet-route-service over REST
   └──► occupancy-alert-service :8084 ──► campusvolt_occupancy_db
            └── calls fleet-route-service and trip-tracking-service over REST
```

- **Separate databases.** Each service owns its database and never reads another service's database. When a service needs data from another service, it calls that service's REST API and passes on the caller's JWT.
- **Authentication.** auth-service checks the password (BCrypt), then signs a JWT containing the email, name and role. Every service has a small `JwtAuthFilter` that verifies the token with the same `JWT_SECRET`. Each service then applies the `ADMIN` / `STUDENT` rules through `@PreAuthorize`. The frontend only hides buttons; the backend enforces every permission.
- **No API gateway.** The frontend reads the four service URLs from `VITE_*` environment variables (see `frontend/src/services/api.js`).

### Roles

| Action | ADMIN | STUDENT |
|---|---|---|
| View vehicles, routes, trips, tracking, occupancy, alerts | Yes | Yes |
| Create / edit / delete vehicles and routes | Yes | No (403) |
| Schedule, start, complete, cancel, pause trips | Yes | No (403) |
| Report passenger counts | Yes | No (403) |

Anyone can register, but new accounts are always `STUDENT`. The first `ADMIN` is created on startup from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Business rules

- **Tracking (simulated).** When a trip starts, the vehicle is placed at the first stop. Every 5 seconds the trip service moves each running trip along its stops at a random campus speed (18–32 km/h). Positions are labelled as simulated in both the API (`"simulated": true`) and the UI. No GPS hardware or map service is used.
- **Route distance.** The admin's distance is used if one was entered. Otherwise it is estimated from the stop coordinates and labelled "estimated". With fewer than two stops the distance is unknown, so the vehicle does not move and no ETA is shown.
- **ETA.** `remaining distance ÷ current speed`, rounded up to whole minutes and shown as "~N min". No ETA is shown when:
  - the trip isn't running
  - the distance is unknown
  - the speed is zero or missing (for example, simulation paused)
  - the location is stale

  In those cases the API returns an `etaNote` explaining why.
- **Occupancy.** `passengers ÷ capacity × 100`. Levels are Normal, Near capacity (85% or more) and Overcrowded (above capacity). Negative counts and counts above twice the capacity are rejected with 400.
- **Alerts** open automatically and resolve automatically when the condition clears:
  - **Overcrowding** (critical): passengers exceed capacity.
  - **Delay**: a trip is more than 5 minutes past its scheduled start. It is a warning, and becomes critical from 15 minutes.
  - **Stale tracking** (warning): a running trip has had no location update for over 2 minutes.

## Getting started

### Requirements

- Java 21 and Maven 3.9+
- Node.js 20+
- PostgreSQL 14+

### 1. Create the databases

```bash
psql -U postgres -f database/create-databases.sql
```

Hibernate creates the tables (`ddl-auto=update`) the first time each service starts.

### 2. Configure the environment

```bash
cp .env.example .env     # then edit DB_PASSWORD and JWT_SECRET
```

The Spring services read plain environment variables. Export the backend values in each terminal before starting a service:

```bash
# bash
export DB_PASSWORD=yourpassword JWT_SECRET=your-long-secret-at-least-32-characters
```

```powershell
# PowerShell
$env:DB_PASSWORD="yourpassword"; $env:JWT_SECRET="your-long-secret-at-least-32-characters"
```

All four services must use the **same** `JWT_SECRET`. If it is unset, a development default is used, so change it for anything other than local development.

### 3. Start the backend (one terminal per service)

```bash
cd backend/auth-service            && mvn spring-boot:run
cd backend/fleet-route-service     && mvn spring-boot:run
cd backend/trip-tracking-service   && mvn spring-boot:run
cd backend/occupancy-alert-service && mvn spring-boot:run
```

Start `fleet-route-service` before the trip and occupancy services, because they depend on it. On first start, the fleet service adds two sample routes and three sample vehicles if its database is empty.

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Sign in with the admin account (`admin@campusvolt.edu` / `Admin@123` unless you changed it), or create a student account.

## Frontend pages

| Page | What it does |
|---|---|
| Login | Sign in or register a student account |
| Dashboard | Fleet summary, running trips and active alerts; refreshes automatically |
| Fleet | Vehicles and routes tables; admins can add, edit and delete |
| Trips | Schedule and control trips; route map with the simulated vehicle position, progress and ETA |
| Occupancy | Passenger load per vehicle, update form (admin), active and resolved alerts |
| Profile | Current user's details and role |

## API summary

All endpoints except register and login need `Authorization: Bearer <token>`.

**Auth (8081)**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

**Fleet (8082)**
- `GET|POST /api/vehicles`
- `GET|PUT|DELETE /api/vehicles/{id}`
- `GET|POST /api/routes`
- `GET|PUT|DELETE /api/routes/{id}`

A vehicle is assigned to a route through `routeId` in the vehicle body. Deleting a route unassigns its vehicles.

**Trips (8083)**
- `GET|POST /api/trips`
- `GET|PUT /api/trips/{id}`
- `GET /api/tracking/vehicles`

`PUT` accepts any of `status` (`IN_PROGRESS`, `COMPLETED`, `CANCELLED`), `scheduledStart` and `simulationPaused`. Allowed status changes are Scheduled → In progress → Completed, and Scheduled / In progress → Cancelled.

**Occupancy (8084)**
- `GET /api/occupancy`
- `PUT /api/occupancy/{vehicleId}` with `{ "passengerCount": 18 }`
- `GET /api/alerts?includeResolved=false`

### Error responses

Errors return a JSON body `{ "message": "..." }` with one of these statuses:

| Status | Meaning |
|---|---|
| 400 | Validation failed or the request breaks a business rule |
| 401 | Missing or invalid token |
| 403 | Wrong role (for example, a student trying to edit) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, registration number or route name; vehicle already on a trip) |
| 503 | A service this request depends on is down |

## Project structure

```
CampusVolt/
├── frontend/              React + Vite app
│   └── src/
│       ├── components/    Layout, shared UI pieces, route map
│       ├── context/       AuthContext (session state)
│       ├── pages/         Login, Dashboard, Fleet, Trips, Occupancy, Profile
│       └── services/      api.js (all REST calls), format.js
├── backend/
│   ├── auth-service/
│   ├── fleet-route-service/
│   ├── trip-tracking-service/
│   └── occupancy-alert-service/
│       └── src/main/java/com/campusvolt/<service>/
│           ├── config/      security, JWT filter, error handling
│           ├── controller/  REST endpoints
│           ├── dto/         request/response records
│           ├── entity/      JPA entities
│           ├── repository/  Spring Data repositories
│           └── service/     business logic
├── database/create-databases.sql
├── output/                Project report (DOCX and PDF)
└── .env.example
```

## Troubleshooting

| Problem | Likely cause |
|---|---|
| 401 on every request after login | Services are using different `JWT_SECRET` values |
| 503 "Fleet service is unavailable" | `fleet-route-service` is not running on port 8082 |
| "Trip data unavailable" or "Trip service is unreachable" banner | `trip-tracking-service` is not running on port 8083 |
| Database connection errors at startup | PostgreSQL is not running, `DB_PASSWORD` is not set, or the databases weren't created |
| Browser CORS errors | The frontend is not on `http://localhost:5173`; set `CORS_ORIGIN` |

## Known limitations

- Vehicle positions are simulated; no GPS device or map tile service is connected.
- There is no API gateway or service discovery; service URLs come from environment variables.
- There are no automated tests or deployment configuration yet; the system is meant to run locally.
