package com.campusvolt.occupancy.repository;

import com.campusvolt.occupancy.entity.VehicleOccupancy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VehicleOccupancyRepository extends JpaRepository<VehicleOccupancy, Long> {

    List<VehicleOccupancy> findAllByOrderByVehicleNameAsc();
}
