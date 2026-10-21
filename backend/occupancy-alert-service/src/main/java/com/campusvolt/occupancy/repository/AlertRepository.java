package com.campusvolt.occupancy.repository;

import com.campusvolt.occupancy.entity.Alert;
import com.campusvolt.occupancy.entity.AlertType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    Optional<Alert> findByConditionKeyAndActiveTrue(String conditionKey);

    List<Alert> findByActiveTrueAndTypeIn(Collection<AlertType> types);

    List<Alert> findByActiveTrueOrderByCreatedAtDesc();

    List<Alert> findTop50ByOrderByCreatedAtDesc();
}
