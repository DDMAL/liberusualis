FROM solr:9

COPY --chown=solr:solr solr/src/main/resources/solrconfig.xml \
    /opt/solr/server/solr/configsets/liber/conf/solrconfig.xml
COPY --chown=solr:solr solr/src/main/resources/schema.xml \
    /opt/solr/server/solr/configsets/liber/conf/schema.xml

CMD ["solr-precreate", "liber-search", "/opt/solr/server/solr/configsets/liber"]