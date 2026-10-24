package com.xxxx.dddd.domain.identity;

public interface IdentityService {
    String createUser(
            String username,
            String firstName,
            String lastName,
            String email,
            String password
    );

    /**
     * Updates first/last name of an existing identity-provider user.
     * Throws AppException(IDENTITY_SYNC_FAILED) when the identity provider rejects or cannot be reached.
     */
    void updateUserName(
            String userId,
            String firstName,
            String lastName
    );
}
