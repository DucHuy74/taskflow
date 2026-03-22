//package com.xxxx.ddd.infrastructure.analyze;
//
//import com.xxxx.dddd.domain.event.UserStoryCreatedEvent;
//import lombok.RequiredArgsConstructor;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.context.event.EventListener;
//import org.springframework.scheduling.annotation.Async;
//import org.springframework.stereotype.Component;
//
//@Component
//@RequiredArgsConstructor
//@Slf4j
//public class UserStoryCreatedListener {
//
//    private final AnalyzeClient analyzeClient;
//
//    @Async
//    @EventListener
//    public void handle(UserStoryCreatedEvent event) {
//
//        log.info("Sending story {} to Python", event.id());
//
//        analyzeClient.sendUserStory(
//                event.id()
//        );
//
//        log.info("Story {} sent to Python successfully", event.id());
//    }
//}
