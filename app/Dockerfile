FROM python:3.12-slim

WORKDIR /project

COPY pyproject.toml uv.lock* ./

RUN pip install .

COPY app ./app

VOLUME ["/app/data"]

CMD ["/bin/bash", "-c", "python3 -m app.utils.create_admin && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

