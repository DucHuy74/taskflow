//package com.xxxx.ddd.infrastructure.graphql.messaging;
//
//import com.xxxx.ddd.infrastructure.async.BackgroundGraphJobService;
//import com.xxxx.dddd.domain.event.UserStoryCreatedEvent;
//import com.xxxx.dddd.domain.model.graph.AnalyzedStory;
//import com.xxxx.dddd.domain.service.graph.UserStoryAnalyzer;
//import lombok.RequiredArgsConstructor;
//import org.springframework.data.neo4j.core.Neo4jClient;
//import org.springframework.stereotype.Component;
//import org.springframework.transaction.event.TransactionPhase;
//import org.springframework.transaction.event.TransactionalEventListener;
//
//import java.util.HashMap;
//import java.util.Map;
//
//@Component
//@RequiredArgsConstructor
//public class UserStoryGraphListener {
//
//    private final BackgroundGraphJobService graphJobService;
//
//    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
//    public void handle(UserStoryCreatedEvent event) {
//
////        graphJobService.enqueueAnalysis(event);
//    }
//}
