package com.campusvolt.fleet.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "route_stops")
public class RouteStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false)
    private Integer sequence;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "route_id")
    private Route route;

    public RouteStop() {}

    public RouteStop(String name, int sequence, double latitude, double longitude, Route route) {
        this.name = name;
        this.sequence = sequence;
        this.latitude = latitude;
        this.longitude = longitude;
        this.route = route;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public Integer getSequence() { return sequence; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
}
