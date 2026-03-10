package com.xxxx.ddd.infrastructure.identity.adapter;

import com.xxxx.ddd.application.model.dto.identity.Credential;
import com.xxxx.ddd.application.model.dto.identity.TokenExchangeParam;
import com.xxxx.ddd.application.model.dto.identity.UserCreationParam;
import com.xxxx.ddd.infrastructure.identity.client.IdentityClient;
import com.xxxx.ddd.infrastructure.identity.exception.ErrorNormalizer;
import com.xxxx.dddd.domain.identity.IdentityService;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;

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
            var token = identityClient.exchangeToken(
                    TokenExchangeParam.builder()
                            .grant_type("client_credentials")
                            .client_id(clientId)
                            .client_secret(clientSecret)
                            .scope("openid")
                            .build()
            );

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

            // 3️⃣ Extract userId (GIỐNG)
            return extractUserId(response);

        } catch (FeignException ex) {
            throw errorNormalizer.handleKeyCloakException(ex);
        }
    }

    private String extractUserId(ResponseEntity<?> response) {
        String location = response.getHeaders()
                .get("Location")
                .getFirst();

        String[] parts = location.split("/");
        return parts[parts.length - 1];
    }
}
