package com.campusvolt.fleet.dto;

import com.campusvolt.fleet.entity.VehicleStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

public final class FleetDtos {

    private FleetDtos() {}

    public record VehicleRequest(
            @NotBlank @Size(max = 20) String registrationNumber,
            @NotBlank @Size(max = 60) String name,
            @NotNull @Min(1) @Max(120) Integer capacity,
            @NotNull VehicleStatus status,
            @NotNull @Min(0) @Max(100) Integer batteryLevel,
            Long routeId) {}

    public record VehicleResponse(Long id, String registrationNumber, String name, Integer capacity,
                                  VehicleStatus status, Integer batteryLevel, Long routeId, String routeName) {}

    public record StopRequest(
            @NotBlank @Size(max = 80) String name,
            @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude) {}

    public record RouteRequest(
            @NotBlank @Size(max = 80) String name,
            @Size(max = 255) String description,
            @Positive @Max(500) Double distanceKm,
            @NotNull @Valid List<StopRequest> stops) {}

    public record StopResponse(Long id, String name, Integer sequence, Double latitude, Double longitude) {}

    public record RouteResponse(Long id, String name, String description, Double manualDistanceKm,
                                Double distanceKm, boolean distanceEstimated, List<StopResponse> stops,
                                long vehicleCount) {}
}
