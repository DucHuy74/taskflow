package com.xxxx.ddd.infrastructure.filter;

import com.xxxx.dddd.domain.repository.ApiKeyRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Date;

@Component
public class ApiKeyFilter extends OncePerRequestFilter {

    @Autowired
    private ApiKeyRepository apiKeyRepository;

//    @Override
//    protected boolean shouldNotFilter(HttpServletRequest request) {
//        String path = request.getRequestURI();
//
//        return path.startsWith("/api/invitations/");
//    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String apiKeyHeader = request.getHeader("x-api-key");

        if (apiKeyHeader == null || apiKeyHeader.isEmpty()) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing x-api-key");
            return;
        }

        var apiKey = apiKeyRepository.findById(apiKeyHeader).orElse(null);

        if (apiKey == null) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid x-api-key");
            return;
        }

        if (!apiKey.getStatus()) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Api key is disabled");
            return;
        }

        if (apiKey.getExpiryDate() != null &&
                apiKey.getExpiryDate().before(new Date())) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Api key expired");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
