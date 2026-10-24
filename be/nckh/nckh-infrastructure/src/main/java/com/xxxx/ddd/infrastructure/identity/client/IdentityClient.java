package com.xxxx.ddd.infrastructure.identity.client;

import com.xxxx.ddd.application.model.dto.identity.TokenExchangeParam;
import com.xxxx.ddd.application.model.dto.identity.TokenExchangeResponse;
import com.xxxx.ddd.application.model.dto.identity.UserCreationParam;
import feign.QueryMap;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.Map;

@FeignClient(name = "identity-client", url = "${idp.url}")
public interface IdentityClient {

    @PostMapping(
            value = "/realms/nckh/protocol/openid-connect/token",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    TokenExchangeResponse exchangeToken(@QueryMap TokenExchangeParam param);

    @PostMapping(value = "/admin/realms/nckh/users", consumes = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<?> createUser(@RequestHeader("authorization") String token, @RequestBody UserCreationParam param);

    @GetMapping(value = "/admin/realms/nckh/users/{userId}")
    Map<String, Object> getUser(@RequestHeader("authorization") String token, @PathVariable("userId") String userId);

    // Keycloak expects the full UserRepresentation on PUT, so callers send back what getUser returned.
    @PutMapping(value = "/admin/realms/nckh/users/{userId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<Void> updateUser(
            @RequestHeader("authorization") String token,
            @PathVariable("userId") String userId,
            @RequestBody Map<String, Object> representation);

}
