FROM maven:3.6-openjdk-8-slim AS builder
WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends unzip zip && rm -rf /var/lib/apt/lists/*
COPY solr/pom.xml .
COPY solr/src ./src
RUN mvn package -DskipTests
# Repack Restlet JARs: their ZIP64 extra fields are rejected by newer JDK 8 builds.
# unzip/zip normalises the format; jar rebuilds the WAR with the fixed JARs.
RUN mkdir /tmp/war && cd /tmp/war && jar xf /build/target/liber-search.war && \
    for j in WEB-INF/lib/org.restlet*.jar; do \
        mkdir /tmp/jt && \
        (cd /tmp/jt && unzip -q "/tmp/war/$j") && \
        (cd /tmp/jt && zip -qr "/tmp/war/$j" .) && \
        rm -rf /tmp/jt; \
    done && \
    jar cf /build/target/liber-search.war -C /tmp/war .

FROM tomcat:8.5-jdk8-openjdk-slim

RUN rm -rf /usr/local/tomcat/webapps/*

COPY --from=builder /build/target/liber-search.war \
    /usr/local/tomcat/webapps/liber-search.war

RUN mkdir -p /var/db/solr/liber

VOLUME /var/db/solr/liber

EXPOSE 8080