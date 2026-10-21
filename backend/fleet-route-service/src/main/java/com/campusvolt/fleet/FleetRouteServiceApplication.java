package com.campusvolt.fleet;

import com.campusvolt.fleet.dto.FleetDtos.RouteRequest;
import com.campusvolt.fleet.dto.FleetDtos.RouteResponse;
import com.campusvolt.fleet.dto.FleetDtos.StopRequest;
import com.campusvolt.fleet.dto.FleetDtos.VehicleRequest;
import com.campusvolt.fleet.entity.VehicleStatus;
import com.campusvolt.fleet.repository.RouteRepository;
import com.campusvolt.fleet.service.RouteService;
import com.campusvolt.fleet.service.VehicleService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.util.List;

@SpringBootApplication
public class FleetRouteServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(FleetRouteServiceApplication.class, args);
    }

    @Bean
    public CommandLineRunner seedFleet(RouteRepository routes, RouteService routeService, VehicleService vehicleService) {
        return args -> {
            if (routes.count() > 0) {
                return;
            }
            RouteResponse loop = routeService.create(new RouteRequest("Main Campus Loop", "Main gate to hostels via academic blocks", null, List.of(
                    new StopRequest("Main Gate", 13.0108, 80.2354),
                    new StopRequest("Library", 13.0118, 80.2367),
                    new StopRequest("Engineering Block", 13.0131, 80.2381),
                    new StopRequest("Hostel Zone", 13.0146, 80.2372))));
            RouteResponse express = routeService.create(new RouteRequest("Metro Express", "Campus to metro station", 3.2, List.of(
                    new StopRequest("Main Gate", 13.0108, 80.2354),
                    new StopRequest("Guindy Metro", 13.0090, 80.2130))));
            vehicleService.create(new VehicleRequest("TN09EV1001", "Shuttle A", 30, VehicleStatus.ACTIVE, 86, loop.id()));
            vehicleService.create(new VehicleRequest("TN09EV1002", "Shuttle B", 24, VehicleStatus.ACTIVE, 64, express.id()));
            vehicleService.create(new VehicleRequest("TN09EV1003", "Shuttle C", 30, VehicleStatus.CHARGING, 22, null));
        };
    }
}
