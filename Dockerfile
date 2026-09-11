# Etapa 1: compilar el jar con Maven
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -B

COPY src ./src
RUN ./mvnw package -DskipTests -B

# Etapa 2: imagen final, liviana, solo con el JRE y el jar ya compilado
FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 3000
ENTRYPOINT ["java", "-jar", "app.jar"]
