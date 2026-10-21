package com.campusvolt.occupancy.dto;

import com.campusvolt.occupancy.entity.Alert;
import com.campusvolt.occupancy.entity.AlertSeverity;
import com.campusvolt.occupancy.entity.AlertType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

public final class OccupancyDtos {

    private OccupancyDtos() {}

    public record OccupancyUpdateRequest(@NotNull @Min(0) Integer passengerCount) {}

    public record OccupancyResponse(Long vehicleId, String vehicleName, Integer capacity, Integer passengerCount,
                                    double occupancyPercent, String level, Instant updatedAt, String updatedBy) {}

    public record AlertResponse(Long id, AlertType type, AlertSeverity severity, Long vehicleId, String vehicleName,
                                String message, boolean active, Instant createdAt, Instant resolvedAt) {
        public static AlertResponse from(Alert a) {
            return new AlertResponse(a.getId(), a.getType(), a.getSeverity(), a.getVehicleId(), a.getVehicleName(),
                    a.getMessage(), a.isActive(), a.getCreatedAt(), a.getResolvedAt());
        }
    }

    public record AlertListResponse(List<AlertResponse> alerts, boolean tripDataAvailable) {}

    public record VehicleInfo(Long id, String name, Integer capacity) {}

    public record TripInfo(Long id, Long vehicleId, String vehicleName, String routeName, String status,
                           int delayMinutes, boolean trackingStale) {}
}
