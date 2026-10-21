package com.campusvolt.occupancy.service;

import com.campusvolt.occupancy.dto.OccupancyDtos.TripInfo;
import com.campusvolt.occupancy.dto.OccupancyDtos.VehicleInfo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Component
public class ServiceClients {

    private final RestClient fleet;
    private final RestClient trips;

    public ServiceClients(@Value("${app.fleet-url}") String fleetUrl, @Value("${app.trip-url}") String tripUrl) {
        this.fleet = RestClient.create(fleetUrl);
        this.trips = RestClient.create(tripUrl);
    }

    public VehicleInfo getVehicle(Long id, String authorization) {
        try {
            return fleet.get().uri("/api/vehicles/" + id)
                    .header(HttpHeaders.AUTHORIZATION, authorization)
                    .retrieve().body(VehicleInfo.class);
        } catch (HttpClientErrorException.NotFound e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found");
        } catch (HttpClientErrorException e) {
            throw new ResponseStatusException(e.getStatusCode(), "Fleet service rejected the request");
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Fleet service is unavailable");
        }
    }

    public Optional<List<TripInfo>> getTrips(String authorization) {
        try {
            TripInfo[] result = trips.get().uri("/api/trips")
                    .header(HttpHeaders.AUTHORIZATION, authorization)
                    .retrieve().body(TripInfo[].class);
            return Optional.of(result == null ? List.of() : Arrays.asList(result));
        } catch (RestClientException e) {
            return Optional.empty();
        }
    }
}
