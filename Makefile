PYTHON = python3

.PHONY: lint
lint:
	@echo "Запуск ruff..."
	ruff format .

.PHONY: run
run:
	@echo "Запуск сервера uvicorn..."
	uvicorn app.main:app --reload
