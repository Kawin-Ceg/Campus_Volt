package com.campusvolt.trip.controller;

import com.campusvolt.trip.dto.TripDtos.TripRequest;
import com.campusvolt.trip.dto.TripDtos.TripResponse;
import com.campusvolt.trip.dto.TripDtos.TripUpdateRequest;
import com.campusvolt.trip.service.TripService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class TripController {

    private final TripService tripService;

    public TripController(TripService tripService) {
        this.tripService = tripService;
    }

    @GetMapping("/trips")
    public List<TripResponse> list() {
        return tripService.findAll();
    }

    @GetMapping("/trips/{id}")
    public TripResponse get(@PathVariable Long id) {
        return tripService.findById(id);
    }

    @PostMapping("/trips")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public TripResponse create(@Valid @RequestBody TripRequest request,
                               @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return tripService.create(request, authorization);
    }

    @PutMapping("/trips/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public TripResponse update(@PathVariable Long id, @RequestBody TripUpdateRequest request) {
        return tripService.update(id, request);
    }

    @GetMapping("/tracking/vehicles")
    public List<TripResponse> tracking() {
        return tripService.findInProgress();
    }
}
