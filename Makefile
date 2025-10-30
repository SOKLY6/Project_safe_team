PYTHON = python3

.PHONY: lint
lint:
	@echo "Запуск ruff..."
	ruff format .
	@echo "Запуск ruff check --fix..."
	ruff check --fix
	@echo "Запуск mypy..."
	mypy .

.PHONY: run
run:
	@echo "Запуск сервера uvicorn..."
	uvicorn app.main:app --reload

.PHONY: migrate
migrate:
	@echo "Применение миграций alembic..."
	alembic upgrade head