package com.xxxx.dddd.domain.identity;

public interface IdentityService {
    String createUser(
            String username,
            String firstName,
            String lastName,
            String email,
            String password
    );
}
