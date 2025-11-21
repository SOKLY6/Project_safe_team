FROM python:3.12-slim

WORKDIR /project

COPY pyproject.toml uv.lock* ./

RUN pip install .

COPY app ./app

VOLUME ["/app/data"]

<<<<<<< HEAD
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
=======
CMD ["/bin/bash", "-c", "python3 -m app.utils.create_admin && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
>>>>>>> 5b6b776 ([refactor] replace create_admin, config, database to utils/)
