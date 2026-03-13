package com.xxxx.ddd.infrastructure.analyze;

import com.xxxx.ddd.application.model.dto.request.AnalyzeRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AnalyzeClient {

    private final RestTemplate restTemplate;

    private final String ANALYZE_API =
            "http://localhost:8000/analyze/receive-story";

    public void sendUserStory(String userStoryId){

        Map<String, String> body = Map.of(
                "userStoryId", userStoryId
        );

        restTemplate.postForObject(
                ANALYZE_API,
                body,
                String.class
        );
    }
}
