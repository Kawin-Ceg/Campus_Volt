package com.campusvolt.trip;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TripTrackingServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TripTrackingServiceApplication.class, args);
    }
}
