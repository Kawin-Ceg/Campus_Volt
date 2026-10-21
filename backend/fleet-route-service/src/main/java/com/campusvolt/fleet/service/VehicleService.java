package com.campusvolt.fleet.service;

import com.campusvolt.fleet.dto.FleetDtos.VehicleRequest;
import com.campusvolt.fleet.dto.FleetDtos.VehicleResponse;
import com.campusvolt.fleet.entity.Route;
import com.campusvolt.fleet.entity.Vehicle;
import com.campusvolt.fleet.repository.RouteRepository;
import com.campusvolt.fleet.repository.VehicleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional
public class VehicleService {

    private final VehicleRepository vehicles;
    private final RouteRepository routes;

    public VehicleService(VehicleRepository vehicles, RouteRepository routes) {
        this.vehicles = vehicles;
        this.routes = routes;
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> findAll() {
        return vehicles.findAllByOrderByNameAsc().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public VehicleResponse findById(Long id) {
        return toResponse(getVehicle(id));
    }

    public VehicleResponse create(VehicleRequest request) {
        return toResponse(vehicles.save(apply(new Vehicle(), request, -1L)));
    }

    public VehicleResponse update(Long id, VehicleRequest request) {
        return toResponse(apply(getVehicle(id), request, id));
    }

    public void delete(Long id) {
        vehicles.delete(getVehicle(id));
    }

    private Vehicle apply(Vehicle vehicle, VehicleRequest request, Long id) {
        String registration = request.registrationNumber().trim().toUpperCase();
        if (vehicles.existsByRegistrationNumberIgnoreCaseAndIdNot(registration, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Registration number is already in use");
        }
        Route route = request.routeId() == null ? null : routes.findById(request.routeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected route does not exist"));
        vehicle.setRegistrationNumber(registration);
        vehicle.setName(request.name().trim());
        vehicle.setCapacity(request.capacity());
        vehicle.setStatus(request.status());
        vehicle.setBatteryLevel(request.batteryLevel());
        vehicle.setRoute(route);
        return vehicle;
    }

    private Vehicle getVehicle(Long id) {
        return vehicles.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found"));
    }

    private VehicleResponse toResponse(Vehicle v) {
        Route route = v.getRoute();
        return new VehicleResponse(v.getId(), v.getRegistrationNumber(), v.getName(), v.getCapacity(), v.getStatus(),
                v.getBatteryLevel(), route == null ? null : route.getId(), route == null ? null : route.getName());
    }
}
