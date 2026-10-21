package com.campusvolt.occupancy.service;

import com.campusvolt.occupancy.dto.OccupancyDtos.AlertListResponse;
import com.campusvolt.occupancy.dto.OccupancyDtos.AlertResponse;
import com.campusvolt.occupancy.dto.OccupancyDtos.TripInfo;
import com.campusvolt.occupancy.entity.Alert;
import com.campusvolt.occupancy.entity.AlertSeverity;
import com.campusvolt.occupancy.entity.AlertType;
import com.campusvolt.occupancy.entity.VehicleOccupancy;
import com.campusvolt.occupancy.repository.AlertRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@Transactional
public class AlertService {

    private static final int CRITICAL_DELAY_MINUTES = 15;

    private final AlertRepository alerts;
    private final ServiceClients clients;

    public AlertService(AlertRepository alerts, ServiceClients clients) {
        this.alerts = alerts;
        this.clients = clients;
    }

    public AlertListResponse list(boolean includeResolved, String authorization) {
        Optional<List<TripInfo>> trips = clients.getTrips(authorization);
        trips.ifPresent(this::syncTripAlerts);
        List<Alert> result = includeResolved ? alerts.findTop50ByOrderByCreatedAtDesc() : alerts.findByActiveTrueOrderByCreatedAtDesc();
        return new AlertListResponse(result.stream().map(AlertResponse::from).toList(), trips.isPresent());
    }

    public void checkOvercrowding(VehicleOccupancy o) {
        String key = "OVERCROWDING:vehicle:" + o.getVehicleId();
        if (o.getPassengerCount() > o.getCapacity()) {
            String message = o.getVehicleName() + " has " + o.getPassengerCount() + " passengers for " + o.getCapacity()
                    + " seats (" + OccupancyService.percent(o.getPassengerCount(), o.getCapacity()) + "%)";
            raise(key, AlertType.OVERCROWDING, AlertSeverity.CRITICAL, o.getVehicleId(), o.getVehicleName(), message);
        } else {
            alerts.findByConditionKeyAndActiveTrue(key).ifPresent(Alert::resolve);
        }
    }

    private void syncTripAlerts(List<TripInfo> trips) {
        Set<String> currentKeys = new HashSet<>();
        for (TripInfo trip : trips) {
            boolean running = trip.status().equals("IN_PROGRESS");
            if (trip.delayMinutes() > 0 && (running || trip.status().equals("SCHEDULED"))) {
                String key = "DELAY:trip:" + trip.id();
                currentKeys.add(key);
                AlertSeverity severity = trip.delayMinutes() >= CRITICAL_DELAY_MINUTES ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
                String verb = running ? " started " : " is ";
                raise(key, AlertType.DELAY, severity, trip.vehicleId(), trip.vehicleName(),
                        "Trip #" + trip.id() + " on " + trip.routeName() + verb + trip.delayMinutes() + " min late");
            }
            if (running && trip.trackingStale()) {
                String key = "STALE:trip:" + trip.id();
                currentKeys.add(key);
                raise(key, AlertType.STALE_TRACKING, AlertSeverity.WARNING, trip.vehicleId(), trip.vehicleName(),
                        "No location update from " + trip.vehicleName() + " for over 2 minutes");
            }
        }
        alerts.findByActiveTrueAndTypeIn(List.of(AlertType.DELAY, AlertType.STALE_TRACKING)).stream()
                .filter(a -> !currentKeys.contains(a.getConditionKey()))
                .forEach(Alert::resolve);
    }

    private void raise(String key, AlertType type, AlertSeverity severity, Long vehicleId, String vehicleName, String message) {
        Alert alert = alerts.findByConditionKeyAndActiveTrue(key).orElseGet(Alert::new);
        alert.setConditionKey(key);
        alert.setType(type);
        alert.setSeverity(severity);
        alert.setVehicleId(vehicleId);
        alert.setVehicleName(vehicleName);
        alert.setMessage(message);
        alerts.save(alert);
    }
}
