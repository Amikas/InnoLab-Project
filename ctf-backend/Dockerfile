# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src /app/src
RUN mvn clean package -DskipTests=true -Dcheckstyle.skip=true

# Stage 2: Runtime with Docker
FROM eclipse-temurin:21-jre
WORKDIR /app

# Install Docker CLI
RUN apt-get update && apt-get install -y \
    docker.io \
    ca-certificates \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy built JAR
COPY --from=builder /app/target/ctfbackend-*.jar app.jar
COPY src/main/resources/files /app/files

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]