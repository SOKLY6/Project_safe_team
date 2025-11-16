FROM python:3.12-slim

WORKDIR /web_portal

COPY . .

EXPOSE 8001

CMD ["python3", "-m", "http.server", "8001", "--bind", "0.0.0.0"]
