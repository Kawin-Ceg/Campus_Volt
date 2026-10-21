package com.campusvolt.occupancy.controller;

import com.campusvolt.occupancy.dto.OccupancyDtos.AlertListResponse;
import com.campusvolt.occupancy.dto.OccupancyDtos.OccupancyResponse;
import com.campusvolt.occupancy.dto.OccupancyDtos.OccupancyUpdateRequest;
import com.campusvolt.occupancy.service.AlertService;
import com.campusvolt.occupancy.service.OccupancyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class OccupancyController {

    private final OccupancyService occupancyService;
    private final AlertService alertService;

    public OccupancyController(OccupancyService occupancyService, AlertService alertService) {
        this.occupancyService = occupancyService;
        this.alertService = alertService;
    }

    @GetMapping("/occupancy")
    public List<OccupancyResponse> occupancy() {
        return occupancyService.findAll();
    }

    @PutMapping("/occupancy/{vehicleId}")
    @PreAuthorize("hasRole('ADMIN')")
    public OccupancyResponse update(@PathVariable Long vehicleId, @Valid @RequestBody OccupancyUpdateRequest request,
                                    @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                    Authentication authentication) {
        return occupancyService.update(vehicleId, request.passengerCount(), authorization, authentication.getName());
    }

    @GetMapping("/alerts")
    public AlertListResponse alerts(@RequestParam(defaultValue = "false") boolean includeResolved,
                                    @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return alertService.list(includeResolved, authorization);
    }
}
