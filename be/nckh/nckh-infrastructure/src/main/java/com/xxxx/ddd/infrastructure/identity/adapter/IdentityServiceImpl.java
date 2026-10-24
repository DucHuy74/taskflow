package com.xxxx.ddd.infrastructure.identity.adapter;

import com.xxxx.ddd.application.model.dto.identity.Credential;
import com.xxxx.ddd.application.model.dto.identity.TokenExchangeParam;
import com.xxxx.ddd.application.model.dto.identity.TokenExchangeResponse;
import com.xxxx.ddd.application.model.dto.identity.UserCreationParam;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.ddd.infrastructure.identity.client.IdentityClient;
import com.xxxx.ddd.infrastructure.identity.exception.ErrorNormalizer;
import com.xxxx.dddd.domain.exception.AppException;
import com.xxxx.dddd.domain.identity.IdentityService;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class IdentityServiceImpl implements IdentityService {

    private final IdentityClient identityClient;
    private final ErrorNormalizer errorNormalizer;

    @Value("${idp.client-id}")
    private String clientId;

    @Value("${idp.client-secret}")
    private String clientSecret;

    @Override
    public String createUser(
            String username,
            String firstName,
            String lastName,
            String email,
            String password
    ) {
        try {
            var token = exchangeClientToken();

            log.info("TokenInfo {}", token);

            var response = identityClient.createUser(
                    "Bearer " + token.getAccessToken(),
                    UserCreationParam.builder()
                            .username(username)
                            .firstName(firstName)
                            .lastName(lastName)
                            .email(email)
                            .enabled(true)
                            .emailVerified(false)
                            .credentials(List.of(
                                    Credential.builder()
                                            .type("password")
                                            .temporary(false)
                                            .value(password)
                                            .build()
                            ))
                            .build()
            );

            // Extract userId
            return extractUserId(response);

        } catch (FeignException ex) {
            throw errorNormalizer.handleKeyCloakException(ex);
        }
    }

    @Override
    public void updateUserName(String userId, String firstName, String lastName) {
        try {
            String bearer = "Bearer " + exchangeClientToken().getAccessToken();

            Map<String, Object> current = identityClient.getUser(bearer, userId);
            Map<String, Object> representation = current == null ? new HashMap<>() : new HashMap<>(current);
            representation.put("firstName", firstName);
            representation.put("lastName", lastName);

            identityClient.updateUser(bearer, userId, representation);
        } catch (FeignException ex) {
            log.warn("Keycloak user update failed for userId={} status={}", userId, ex.status(), ex);
            throw new AppException(ErrorCode.IDENTITY_SYNC_FAILED);
        }
    }

    private TokenExchangeResponse exchangeClientToken() {
        return identityClient.exchangeToken(
                TokenExchangeParam.builder()
                        .grant_type("client_credentials")
                        .client_id(clientId)
                        .client_secret(clientSecret)
                        .scope("openid")
                        .build()
        );
    }

    private String extractUserId(ResponseEntity<?> response) {
        String location = response.getHeaders()
                .get("Location")
                .get(0);

        String[] parts = location.split("/");
        return parts[parts.length - 1];
    }
}
