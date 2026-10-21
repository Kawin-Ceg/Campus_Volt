package com.campusvolt.trip.service;

import com.campusvolt.trip.entity.Trip;
import com.campusvolt.trip.entity.TripStatus;
import com.campusvolt.trip.repository.TripRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Moves in-progress trips along their stored route path. All positions are simulated, not real GPS.
 */
@Component
public class TrackingSimulator {

    private static final double MIN_SPEED_KMH = 18;
    private static final double MAX_SPEED_KMH = 32;
    private static final long MAX_STEP_SECONDS = 10;

    private final TripRepository trips;

    public TrackingSimulator(TripRepository trips) {
        this.trips = trips;
    }

    public void start(Trip trip) {
        trip.setProgressKm(0);
        List<double[]> path = parsePath(trip.getRoutePath());
        if (!path.isEmpty()) {
            trip.setLatitude(path.get(0)[0]);
            trip.setLongitude(path.get(0)[1]);
            trip.setLastLocationUpdate(Instant.now());
        }
        trip.setSpeedKmh(canMove(trip, path) && !trip.isSimulationPaused() ? randomSpeed() : null);
    }

    @Scheduled(fixedRate = 5000)
    @Transactional
    public void tick() {
        Instant now = Instant.now();
        for (Trip trip : trips.findByStatus(TripStatus.IN_PROGRESS)) {
            List<double[]> path = parsePath(trip.getRoutePath());
            if (trip.isSimulationPaused() || !canMove(trip, path)) {
                continue;
            }
            long seconds = trip.getLastLocationUpdate() == null ? 0
                    : Math.min(MAX_STEP_SECONDS, Duration.between(trip.getLastLocationUpdate(), now).getSeconds());
            double speed = randomSpeed();
            double distance = trip.getRouteDistanceKm();
            double progress = Math.min(distance, trip.getProgressKm() + speed * seconds / 3600.0);
            double[] point = pointAlong(path, progress / distance);

            trip.setProgressKm(progress);
            trip.setLatitude(point[0]);
            trip.setLongitude(point[1]);
            trip.setSpeedKmh(speed);
            trip.setLastLocationUpdate(now);
            if (progress >= distance) {
                trip.setStatus(TripStatus.COMPLETED);
                trip.setCompletedAt(now);
                trip.setSpeedKmh(null);
            }
        }
    }

    private boolean canMove(Trip trip, List<double[]> path) {
        return path.size() >= 2 && trip.getRouteDistanceKm() != null && trip.getRouteDistanceKm() > 0;
    }

    private double randomSpeed() {
        return Math.round(ThreadLocalRandom.current().nextDouble(MIN_SPEED_KMH, MAX_SPEED_KMH) * 10) / 10.0;
    }

    private double[] pointAlong(List<double[]> path, double fraction) {
        double[] segmentLengths = new double[path.size() - 1];
        double total = 0;
        for (int i = 0; i < segmentLengths.length; i++) {
            segmentLengths[i] = Math.hypot(path.get(i + 1)[0] - path.get(i)[0], path.get(i + 1)[1] - path.get(i)[1]);
            total += segmentLengths[i];
        }
        double target = Math.max(0, Math.min(1, fraction)) * total;
        for (int i = 0; i < segmentLengths.length; i++) {
            if (target <= segmentLengths[i] || i == segmentLengths.length - 1) {
                double t = segmentLengths[i] == 0 ? 0 : Math.min(1, target / segmentLengths[i]);
                double[] a = path.get(i);
                double[] b = path.get(i + 1);
                return new double[]{a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t};
            }
            target -= segmentLengths[i];
        }
        return path.get(path.size() - 1);
    }

    private List<double[]> parsePath(String routePath) {
        List<double[]> points = new ArrayList<>();
        if (routePath == null || routePath.isBlank()) {
            return points;
        }
        for (String pair : routePath.split(";")) {
            String[] parts = pair.split(",");
            points.add(new double[]{Double.parseDouble(parts[0]), Double.parseDouble(parts[1])});
        }
        return points;
    }
}
