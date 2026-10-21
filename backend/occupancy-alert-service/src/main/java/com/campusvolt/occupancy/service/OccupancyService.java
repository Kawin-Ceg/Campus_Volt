package com.campusvolt.occupancy.service;

import com.campusvolt.occupancy.dto.OccupancyDtos.OccupancyResponse;
import com.campusvolt.occupancy.dto.OccupancyDtos.VehicleInfo;
import com.campusvolt.occupancy.entity.VehicleOccupancy;
import com.campusvolt.occupancy.repository.VehicleOccupancyRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
@Transactional
public class OccupancyService {

    private static final double NEAR_CAPACITY_PERCENT = 85;
    private static final int MAX_OVERLOAD_FACTOR = 2;

    private final VehicleOccupancyRepository occupancies;
    private final ServiceClients clients;
    private final AlertService alertService;

    public OccupancyService(VehicleOccupancyRepository occupancies, ServiceClients clients, AlertService alertService) {
        this.occupancies = occupancies;
        this.clients = clients;
        this.alertService = alertService;
    }

    @Transactional(readOnly = true)
    public List<OccupancyResponse> findAll() {
        return occupancies.findAllByOrderByVehicleNameAsc().stream().map(this::toResponse).toList();
    }

    public OccupancyResponse update(Long vehicleId, int passengerCount, String authorization, String updatedBy) {
        VehicleInfo vehicle = clients.getVehicle(vehicleId, authorization);
        if (passengerCount > vehicle.capacity() * MAX_OVERLOAD_FACTOR) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Passenger count of " + passengerCount + " is not plausible for a " + vehicle.capacity() + "-seat vehicle");
        }
        VehicleOccupancy occupancy = occupancies.findById(vehicleId).orElseGet(VehicleOccupancy::new);
        occupancy.setVehicleId(vehicle.id());
        occupancy.setVehicleName(vehicle.name());
        occupancy.setCapacity(vehicle.capacity());
        occupancy.setPassengerCount(passengerCount);
        occupancy.setUpdatedAt(Instant.now());
        occupancy.setUpdatedBy(updatedBy);
        occupancies.save(occupancy);
        alertService.checkOvercrowding(occupancy);
        return toResponse(occupancy);
    }

    public static double percent(int passengers, int capacity) {
        return Math.round(passengers * 1000.0 / capacity) / 10.0;
    }

    private OccupancyResponse toResponse(VehicleOccupancy o) {
        double percent = percent(o.getPassengerCount(), o.getCapacity());
        String level = o.getPassengerCount() > o.getCapacity() ? "OVERCROWDED"
                : percent >= NEAR_CAPACITY_PERCENT ? "NEAR_CAPACITY" : "NORMAL";
        return new OccupancyResponse(o.getVehicleId(), o.getVehicleName(), o.getCapacity(), o.getPassengerCount(),
                percent, level, o.getUpdatedAt(), o.getUpdatedBy());
    }
}
