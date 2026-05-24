FROM maven:3.6-openjdk-8-slim AS builder
WORKDIR /build
COPY solr/pom.xml .
COPY solr/src ./src
RUN mvn package -DskipTests

FROM tomcat:8.5-jdk8-openjdk-slim

RUN rm -rf /usr/local/tomcat/webapps/*

COPY --from=builder /build/target/liber-search.war \
    /usr/local/tomcat/webapps/liber-search.war

RUN mkdir -p /var/db/solr/liber

VOLUME /var/db/solr/liber

EXPOSE 8080