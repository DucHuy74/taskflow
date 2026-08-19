# =========================================================
# Stage 1: Build
# =========================================================
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

# Copy toàn bộ Maven project
COPY . .

# Build nckh-start và các module dependency
RUN mvn -pl nckh-start -am clean package -DskipTests


# =========================================================
# Stage 2: Runtime
# =========================================================
FROM eclipse-temurin:21-jre

WORKDIR /app

# Copy JAR của module nckh-start
COPY --from=build /app/nckh-start/target/*.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]