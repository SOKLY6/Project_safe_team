PYTHON = python3

.PHONY: setup
setup:
	curl -LsSf https://astral.sh/uv/install.sh | sh
	uv sync

.PHONY: lint
lint:
	@echo "Запуск ruff..."
	ruff format .
	@echo "Запуск ruff check --fix..."
	ruff check --fix
	ruff check .

.PHONY: runserver
runserver:
	@echo "Запуск сервера uvicorn..."
	uvicorn app.main:app --reload

.PHONY: stopserver
stopserver:
	@echo "Прерывание работы сервера"
	pkill -f uvicorn

.PHONY: migrate
migrate:
	@echo "Применение миграций alembic..."
	alembic upgrade head

.PHONY: runhttp
runhttp:
	@echo "Запуск сайта..."
	@cd web_portal && python3 -m http.server 8001 --bind 127.0.0.1

.PHONY: runbot
runbot:
	@echo "Запуск бота..."
	python3 -m telegram_bot.main

