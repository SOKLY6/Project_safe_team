FROM python:3.12-slim

WORKDIR /project

COPY pyproject.toml uv.lock* ./

RUN pip install .

COPY app ./app

VOLUME ["/app/data"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
