package com.campusvolt.trip.repository;

import com.campusvolt.trip.entity.Trip;
import com.campusvolt.trip.entity.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TripRepository extends JpaRepository<Trip, Long> {

    List<Trip> findAllByOrderByScheduledStartDesc();

    List<Trip> findByStatus(TripStatus status);

    boolean existsByVehicleIdAndStatusAndIdNot(Long vehicleId, TripStatus status, Long id);
}
