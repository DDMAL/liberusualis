FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY search/ .
COPY diva.js/ ./static/diva.js/
COPY search/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8091

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["python", "server.py"]