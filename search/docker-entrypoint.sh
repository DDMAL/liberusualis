#!/bin/sh
set -e

cat > /app/conf.py <<EOF
SOLR_URL = "${SOLR_URL:-http://solr:8983/solr/liber-search}"
IMAGE_DIRECTORY = "${IMAGE_DIRECTORY:-/srv/images/liber}"
IIP_SERVER = "${IIP_SERVER:-http://images.simssa.ca/iip/iipsrv.fcgi?FIF=/liber/}"
APP_ROOT = "${APP_ROOT:-/}"
EOF

exec "$@"