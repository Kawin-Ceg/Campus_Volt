package com.campusvolt.fleet.repository;

import com.campusvolt.fleet.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RouteRepository extends JpaRepository<Route, Long> {

    List<Route> findAllByOrderByNameAsc();

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
