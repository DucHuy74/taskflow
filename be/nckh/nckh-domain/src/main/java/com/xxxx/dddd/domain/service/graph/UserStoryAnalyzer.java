//
//package com.xxxx.dddd.domain.service.graph;
//
//import com.xxxx.dddd.domain.model.graph.AnalyzedStory;
//import org.springframework.stereotype.Component;
//
//import java.util.List;
//import java.util.Map;
//import java.util.regex.Pattern;
//
//@Component
//public class UserStoryAnalyzer {
//
//    private static final Map<String, List<String>> ACTOR_KEYWORDS = Map.of(
//            "user", List.of("as a user", "as a customer", "as a client"),
//            "admin", List.of("as an admin", "as a administrator"),
//            "manager", List.of("as a manager", "as a project manager")
//    );
//
//    private static final Map<String, List<String>> ACTION_KEYWORDS = Map.ofEntries(
//
//            Map.entry("LOGIN", List.of("login", "log in", "sign in", "authenticate")),
//            Map.entry("LOGOUT", List.of("logout", "log out", "sign out")),
//
//            Map.entry("REGISTER", List.of("register", "sign up", "create account")),
//            Map.entry("RESET", List.of("reset password", "forgot password", "recover password")),
//
//            Map.entry("CREATE", List.of("create", "add", "insert", "make", "write", "generate")),
//            Map.entry("UPDATE", List.of("edit", "update", "modify", "change")),
//            Map.entry("DELETE", List.of("delete", "remove", "erase", "destroy")),
//
//            Map.entry("VIEW", List.of("view", "see", "read", "display", "show")),
//            Map.entry("SEARCH", List.of("search", "find", "lookup", "filter", "query")),
//            Map.entry("LIST", List.of("list", "browse", "get all")),
//
//            Map.entry("UPLOAD", List.of("upload", "attach", "import")),
//            Map.entry("DOWNLOAD", List.of("download", "export", "save file")),
//
//            Map.entry("ASSIGN", List.of("assign", "allocate")),
//            Map.entry("SHARE", List.of("share", "send", "distribute")),
//            Map.entry("COMMENT", List.of("comment", "reply", "respond")),
//
//            Map.entry("APPROVE", List.of("approve", "accept", "confirm")),
//            Map.entry("REJECT", List.of("reject", "decline")),
//
//            Map.entry("NOTIFY", List.of("notify", "alert", "send notification")),
//            Map.entry("SUBSCRIBE", List.of("subscribe", "follow")),
//            Map.entry("UNSUBSCRIBE", List.of("unsubscribe", "unfollow")),
//
//            Map.entry("CONFIGURE", List.of("configure", "setup", "set up")),
//            Map.entry("ENABLE", List.of("enable", "activate")),
//            Map.entry("DISABLE", List.of("disable", "deactivate")),
//
//            Map.entry("ARCHIVE", List.of("archive", "store")),
//            Map.entry("RESTORE", List.of("restore", "recover")),
//
//            Map.entry("VALIDATE", List.of("validate", "verify", "check")),
//            Map.entry("SUBMIT", List.of("submit", "send form")),
//
//            Map.entry("SYNC", List.of("sync", "synchronize")),
//            Map.entry("CONNECT", List.of("connect", "link", "integrate"))
//    );
//
//
//    private static final Map<String, List<String>> OBJECT_KEYWORDS = Map.ofEntries(
//
//            Map.entry("system", List.of("system", "application", "platform")),
//
//            Map.entry("password", List.of("password", "PIN", "otp", "key")),
//
//            Map.entry("account", List.of("account", "user account")),
//            Map.entry("user", List.of("user", "member")),
//            Map.entry("role", List.of("role", "permission", "access control")),
//
//            Map.entry("profile", List.of("profile", "user profile")),
//
//            Map.entry("project", List.of("project", "workspace")),
//            Map.entry("task", List.of("task", "todo", "job", "ticket")),
//            Map.entry("sprint", List.of("sprint", "iteration")),
//            Map.entry("backlog", List.of("backlog")),
//
//            Map.entry("note", List.of("note", "memo", "document")),
//            Map.entry("comment", List.of("comment", "feedback", "review")),
//            Map.entry("attachment", List.of("attachment", "file", "upload")),
//
//            Map.entry("report", List.of("report", "analytics", "dashboard", "statistics")),
//            Map.entry("notification", List.of("notification", "alert", "message")),
//
//            Map.entry("settings", List.of("settings", "configuration", "preferences")),
//            Map.entry("template", List.of("template", "form template")),
//
//            Map.entry("data", List.of("data", "dataset", "record")),
//            Map.entry("log", List.of("log", "history", "activity log")),
//
//            Map.entry("integration", List.of("integration", "external service", "third party")),
//            Map.entry("api", List.of("api", "endpoint", "service")),
//
//            Map.entry("folder", List.of("folder", "directory")),
//            Map.entry("tag", List.of("tag", "label", "category"))
//    );
//
//    private String normalize(String text) {
//
//        text = text.toLowerCase();
//
//        // bỏ dấu câu
//        text = text.replaceAll("[^a-z0-9 ]", " ");
//
//        // nhiều space -> 1 space
//        text = text.replaceAll("\\s+", " ").trim();
//
//        return text;
//    }
//
//    public AnalyzedStory analyze(String storyText) {
//
//        String normalized = normalize(storyText);
//
//        String actor = detectFromDictionary(normalized, ACTOR_KEYWORDS, "unknown");
//        String action = detectFromDictionary(normalized, ACTION_KEYWORDS, "UNKNOWN");
//        String object = detectObject(normalized, action);
//
//        return new AnalyzedStory(actor, action, object);
//    }
//
//    private String detectFromDictionary(String text,
//                                        Map<String, List<String>> dictionary,
//                                        String defaultValue) {
//
//        for (var entry : dictionary.entrySet()) {
//
//            List<String> keywords = entry.getValue()
//                    .stream()
//                    .sorted((a, b) -> Integer.compare(b.length(), a.length()))
//                    .toList();
//
//            for (String keyword : keywords) {
//
//                if (Pattern.compile("\\b" + Pattern.quote(keyword) + "\\b")
//                        .matcher(text)
//                        .find()) {
//
//                    return entry.getKey();
//                }
//            }
//        }
//
//        return defaultValue;
//    }
//
//    private String detectObject(String text, String action) {
//
//        switch (action) {
//
//            case "LOGIN":
//                return "system";
//
//            case "REGISTER":
//                return "account";
//
//            case "RESET":
//                return "password";
//
//            case "DELETE":
//                if (text.contains("account")) return "account";
//                if (text.contains("note")) return "note";
//                if (text.contains("user")) return "user";
//                break;
//
//            case "UPDATE":
//                if (text.contains("note")) return "note";
//                if (text.contains("profile")) return "profile";
//                break;
//        }
//
//        return detectFromDictionary(text, OBJECT_KEYWORDS, "unknown");
//    }
//}
