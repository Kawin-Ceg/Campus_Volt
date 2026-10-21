package com.campusvolt.trip.service;

import com.campusvolt.trip.dto.TripDtos.RouteInfo;
import com.campusvolt.trip.dto.TripDtos.VehicleInfo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Component
public class FleetClient {

    private final RestClient client;

    public FleetClient(@Value("${app.fleet-url}") String fleetUrl) {
        this.client = RestClient.create(fleetUrl);
    }

    public VehicleInfo getVehicle(Long id, String authorization) {
        return get("/api/vehicles/" + id, authorization, VehicleInfo.class, "Vehicle not found");
    }

    public RouteInfo getRoute(Long id, String authorization) {
        return get("/api/routes/" + id, authorization, RouteInfo.class, "Route not found");
    }

    private <T> T get(String path, String authorization, Class<T> type, String notFoundMessage) {
        try {
            return client.get().uri(path).header(HttpHeaders.AUTHORIZATION, authorization).retrieve().body(type);
        } catch (HttpClientErrorException.NotFound e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, notFoundMessage);
        } catch (HttpClientErrorException e) {
            throw new ResponseStatusException(e.getStatusCode(), "Fleet service rejected the request");
        } catch (ResourceAccessException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Fleet service is unavailable");
        }
    }
}
