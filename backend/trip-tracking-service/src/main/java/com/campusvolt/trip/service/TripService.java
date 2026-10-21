package com.campusvolt.trip.service;

import com.campusvolt.trip.dto.TripDtos.*;
import com.campusvolt.trip.entity.Trip;
import com.campusvolt.trip.entity.TripStatus;
import com.campusvolt.trip.repository.TripRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class TripService {

    private static final int DELAY_GRACE_MINUTES = 5;
    private static final long STALE_AFTER_SECONDS = 120;
    private static final Set<String> UNAVAILABLE_VEHICLE_STATUSES = Set.of("MAINTENANCE", "OUT_OF_SERVICE");

    private final TripRepository trips;
    private final FleetClient fleetClient;
    private final TrackingSimulator simulator;

    public TripService(TripRepository trips, FleetClient fleetClient, TrackingSimulator simulator) {
        this.trips = trips;
        this.fleetClient = fleetClient;
        this.simulator = simulator;
    }

    @Transactional(readOnly = true)
    public List<TripResponse> findAll() {
        return trips.findAllByOrderByScheduledStartDesc().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<TripResponse> findInProgress() {
        return trips.findByStatus(TripStatus.IN_PROGRESS).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public TripResponse findById(Long id) {
        return toResponse(getTrip(id));
    }

    public TripResponse create(TripRequest request, String authorization) {
        VehicleInfo vehicle = fleetClient.getVehicle(request.vehicleId(), authorization);
        if (UNAVAILABLE_VEHICLE_STATUSES.contains(vehicle.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, vehicle.name() + " is not available for trips");
        }
        Long routeId = request.routeId() != null ? request.routeId() : vehicle.routeId();
        if (routeId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a route or assign one to the vehicle first");
        }
        RouteInfo route = fleetClient.getRoute(routeId, authorization);

        Trip trip = new Trip();
        trip.setVehicleId(vehicle.id());
        trip.setVehicleName(vehicle.name());
        trip.setRouteId(route.id());
        trip.setRouteName(route.name());
        trip.setRouteDistanceKm(route.distanceKm());
        trip.setRoutePath(route.stops().stream()
                .map(s -> s.latitude() + "," + s.longitude())
                .collect(Collectors.joining(";")));
        trip.setScheduledStart(request.scheduledStart());
        return toResponse(trips.save(trip));
    }

    public TripResponse update(Long id, TripUpdateRequest request) {
        Trip trip = getTrip(id);
        if (request.scheduledStart() != null) {
            if (trip.getStatus() != TripStatus.SCHEDULED) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only scheduled trips can be rescheduled");
            }
            trip.setScheduledStart(request.scheduledStart());
        }
        if (request.simulationPaused() != null) {
            trip.setSimulationPaused(request.simulationPaused());
            if (request.simulationPaused() && trip.getSpeedKmh() != null) {
                trip.setSpeedKmh(0.0);
            }
        }
        if (request.status() != null && request.status() != trip.getStatus()) {
            changeStatus(trip, request.status());
        }
        return toResponse(trip);
    }

    private void changeStatus(Trip trip, TripStatus next) {
        TripStatus current = trip.getStatus();
        boolean allowed = switch (next) {
            case IN_PROGRESS -> current == TripStatus.SCHEDULED;
            case COMPLETED -> current == TripStatus.IN_PROGRESS;
            case CANCELLED -> current == TripStatus.SCHEDULED || current == TripStatus.IN_PROGRESS;
            case SCHEDULED -> false;
        };
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot change trip from " + current + " to " + next);
        }
        if (next == TripStatus.IN_PROGRESS) {
            if (trips.existsByVehicleIdAndStatusAndIdNot(trip.getVehicleId(), TripStatus.IN_PROGRESS, trip.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, trip.getVehicleName() + " is already on another trip");
            }
            trip.setStartedAt(Instant.now());
            simulator.start(trip);
        } else {
            trip.setCompletedAt(Instant.now());
            trip.setSpeedKmh(null);
        }
        trip.setStatus(next);
    }

    private Trip getTrip(Long id) {
        return trips.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));
    }

    private TripResponse toResponse(Trip t) {
        Instant now = Instant.now();
        boolean inProgress = t.getStatus() == TripStatus.IN_PROGRESS;
        Double distance = t.getRouteDistanceKm();

        Double progressPercent = null;
        if (distance != null && distance > 0) {
            progressPercent = Math.min(100.0, Math.round(t.getProgressKm() / distance * 1000) / 10.0);
        }

        boolean stale = inProgress && t.getLastLocationUpdate() != null
                && Duration.between(t.getLastLocationUpdate(), now).getSeconds() > STALE_AFTER_SECONDS;

        Integer eta = null;
        String etaNote;
        if (!inProgress) {
            etaNote = "Trip is not in progress";
        } else if (distance == null || distance <= 0) {
            etaNote = "Route distance unavailable";
        } else if (t.getSpeedKmh() == null || t.getSpeedKmh() <= 0) {
            etaNote = "Vehicle is not moving";
        } else if (stale) {
            etaNote = "Location data is stale";
        } else {
            double remainingKm = Math.max(0, distance - t.getProgressKm());
            eta = (int) Math.ceil(remainingKm / t.getSpeedKmh() * 60);
            etaNote = "Estimated from remaining distance and current speed";
        }

        return new TripResponse(t.getId(), t.getVehicleId(), t.getVehicleName(), t.getRouteId(), t.getRouteName(),
                distance, t.getStatus(), t.getScheduledStart(), t.getStartedAt(), t.getCompletedAt(),
                delayMinutes(t, now), t.getLatitude(), t.getLongitude(), t.getSpeedKmh(), progressPercent,
                t.getLastLocationUpdate(), stale, t.isSimulationPaused(), eta, etaNote, true);
    }

    private int delayMinutes(Trip t, Instant now) {
        Instant reference = switch (t.getStatus()) {
            case SCHEDULED -> now;
            case IN_PROGRESS, COMPLETED -> t.getStartedAt();
            case CANCELLED -> null;
        };
        if (reference == null) {
            return 0;
        }
        long late = Duration.between(t.getScheduledStart(), reference).toMinutes();
        return late > DELAY_GRACE_MINUTES ? (int) late : 0;
    }
}
