package com.campusvolt.fleet.repository;

import com.campusvolt.fleet.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    List<Vehicle> findAllByOrderByNameAsc();

    List<Vehicle> findByRouteId(Long routeId);

    long countByRouteId(Long routeId);

    boolean existsByRegistrationNumberIgnoreCaseAndIdNot(String registrationNumber, Long id);
}
