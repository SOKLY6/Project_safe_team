FROM python:3.12-slim

WORKDIR /project

COPY pyproject.toml ./

RUN pip install .

COPY . ./

VOLUME ["/app/data"]

CMD ["python3", "-m", "telegram_bot.main"]
