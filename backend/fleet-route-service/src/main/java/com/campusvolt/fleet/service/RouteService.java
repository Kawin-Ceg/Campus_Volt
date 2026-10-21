package com.campusvolt.fleet.service;

import com.campusvolt.fleet.dto.FleetDtos.*;
import com.campusvolt.fleet.entity.Route;
import com.campusvolt.fleet.entity.RouteStop;
import com.campusvolt.fleet.repository.RouteRepository;
import com.campusvolt.fleet.repository.VehicleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional
public class RouteService {

    private static final double EARTH_RADIUS_KM = 6371.0;

    private final RouteRepository routes;
    private final VehicleRepository vehicles;

    public RouteService(RouteRepository routes, VehicleRepository vehicles) {
        this.routes = routes;
        this.vehicles = vehicles;
    }

    @Transactional(readOnly = true)
    public List<RouteResponse> findAll() {
        return routes.findAllByOrderByNameAsc().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public RouteResponse findById(Long id) {
        return toResponse(getRoute(id));
    }

    public RouteResponse create(RouteRequest request) {
        return toResponse(routes.save(apply(new Route(), request, -1L)));
    }

    public RouteResponse update(Long id, RouteRequest request) {
        Route route = apply(getRoute(id), request, id);
        return toResponse(routes.saveAndFlush(route));
    }

    public void delete(Long id) {
        Route route = getRoute(id);
        vehicles.findByRouteId(id).forEach(v -> v.setRoute(null));
        routes.delete(route);
    }

    private Route apply(Route route, RouteRequest request, Long id) {
        if (routes.existsByNameIgnoreCaseAndIdNot(request.name().trim(), id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A route with this name already exists");
        }
        route.setName(request.name().trim());
        route.setDescription(request.description() == null ? null : request.description().trim());
        route.setDistanceKm(request.distanceKm());
        route.getStops().clear();
        for (int i = 0; i < request.stops().size(); i++) {
            StopRequest stop = request.stops().get(i);
            route.getStops().add(new RouteStop(stop.name().trim(), i + 1, stop.latitude(), stop.longitude(), route));
        }
        return route;
    }

    private Route getRoute(Long id) {
        return routes.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found"));
    }

    private RouteResponse toResponse(Route route) {
        List<StopResponse> stops = route.getStops().stream()
                .map(s -> new StopResponse(s.getId(), s.getName(), s.getSequence(), s.getLatitude(), s.getLongitude()))
                .toList();
        Double distance = route.getDistanceKm();
        boolean estimated = false;
        if (distance == null && stops.size() >= 2) {
            distance = Math.round(pathLengthKm(stops) * 100) / 100.0;
            estimated = true;
        }
        return new RouteResponse(route.getId(), route.getName(), route.getDescription(), route.getDistanceKm(),
                distance, estimated, stops, vehicles.countByRouteId(route.getId()));
    }

    private double pathLengthKm(List<StopResponse> stops) {
        double total = 0;
        for (int i = 1; i < stops.size(); i++) {
            total += haversineKm(stops.get(i - 1), stops.get(i));
        }
        return total;
    }

    private double haversineKm(StopResponse a, StopResponse b) {
        double dLat = Math.toRadians(b.latitude() - a.latitude());
        double dLon = Math.toRadians(b.longitude() - a.longitude());
        double h = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(a.latitude())) * Math.cos(Math.toRadians(b.latitude())) * Math.pow(Math.sin(dLon / 2), 2);
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
    }
}
