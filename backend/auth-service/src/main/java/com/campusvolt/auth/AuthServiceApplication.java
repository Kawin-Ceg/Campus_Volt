package com.campusvolt.auth;

import com.campusvolt.auth.entity.Role;
import com.campusvolt.auth.repository.UserRepository;
import com.campusvolt.auth.service.AuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class AuthServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuthServiceApplication.class, args);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CommandLineRunner seedAdmin(UserRepository users, AuthService authService,
                                       @Value("${app.admin.email}") String email,
                                       @Value("${app.admin.password}") String password) {
        return args -> {
            if (!users.existsByEmailIgnoreCase(email)) {
                authService.createUser("Transport Admin", email, password, Role.ADMIN);
            }
        };
    }
}
