package com.campusvolt.occupancy.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "vehicle_occupancy")
public class VehicleOccupancy {

    @Id
    private Long vehicleId;

    @Column(nullable = false, length = 60)
    private String vehicleName;

    @Column(nullable = false)
    private Integer capacity;

    @Column(nullable = false)
    private Integer passengerCount;

    @Column(nullable = false)
    private Instant updatedAt;

    @Column(length = 150)
    private String updatedBy;

    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }
    public String getVehicleName() { return vehicleName; }
    public void setVehicleName(String vehicleName) { this.vehicleName = vehicleName; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public Integer getPassengerCount() { return passengerCount; }
    public void setPassengerCount(Integer passengerCount) { this.passengerCount = passengerCount; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
