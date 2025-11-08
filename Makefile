PYTHON = python3

.PHONY: lint
lint:
	@echo "Запуск ruff..."
	ruff format .
	@echo "Запуск ruff check --fix..."
	ruff check --fix
	@echo "Запуск mypy..."
	mypy .

.PHONY: runserver
run:
	@echo "Запуск сервера uvicorn..."
	uvicorn app.main:app --reload

.PHONY: migrate
migrate:
	@echo "Применение миграций alembic..."
	alembic upgrade head

.PHONY: runhttp
	@echo "Запуск сайта..."
	python3 -m http.server 8001
