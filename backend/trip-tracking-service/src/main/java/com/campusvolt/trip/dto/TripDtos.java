package com.campusvolt.trip.dto;

import com.campusvolt.trip.entity.TripStatus;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

public final class TripDtos {

    private TripDtos() {}

    public record TripRequest(@NotNull Long vehicleId, Long routeId, @NotNull Instant scheduledStart) {}

    public record TripUpdateRequest(TripStatus status, Instant scheduledStart, Boolean simulationPaused) {}

    public record TripResponse(Long id, Long vehicleId, String vehicleName, Long routeId, String routeName,
                               Double routeDistanceKm, TripStatus status, Instant scheduledStart,
                               Instant startedAt, Instant completedAt, int delayMinutes,
                               Double latitude, Double longitude, Double speedKmh, Double progressPercent,
                               Instant lastLocationUpdate, boolean trackingStale, boolean simulationPaused,
                               Integer etaMinutes, String etaNote, boolean simulated) {}

    public record VehicleInfo(Long id, String name, String status, Long routeId) {}

    public record StopInfo(String name, Double latitude, Double longitude) {}

    public record RouteInfo(Long id, String name, Double distanceKm, List<StopInfo> stops) {}
}
