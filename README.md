# Структура проекта (в идеале)
```
qr-access-system/
├── 📄 README.md
├── 📄 requirements.txt
├── 📄 .gitignore
├── 📄 .env.example
├── 📄 config.py
│
├── 🔧 app/                          # Основное приложение FastAPI
│   ├── 📄 __init__.py
│   ├── 📄 main.py                   # Точка входа FastAPI
│   ├── 📄 database.py               # Настройки базы данных
│   │
│   ├── 📁 models/                   # SQLAlchemy модели
│   │   ├── 📄 __init__.py
│   │   ├── 📄 user.py
│   │   ├── 📄 organization.py
│   │   ├── 📄 qr_code.py
│   │   └── 📄 access_log.py
│   │
│   ├── 📁 schemas/                  # Pydantic схемы
│   │   ├── 📄 __init__.py
│   │   ├── 📄 user.py
│   │   ├── 📄 organization.py
│   │   └── 📄 base.py
│   │
│   ├── 📁 api/                      # API эндпоинты
│   │   ├── 📄 __init__.py
│   │   ├── 📄 users.py
│   │   ├── 📄 organizations.py
│   │   └── 📄 health.py             # Health check эндпоинт
│   │
│   ├── 📁 services/                 # Бизнес-логика
│   │   ├── 📄 __init__.py
│   │   ├── 📄 user_service.py
│   │   └── 📄 organization_service.py
│   │
│   └── 📁 utils/                    # Вспомогательные утилиты
│       ├── 📄 __init__.py
│       └── 📄 logger.py
│
├── 🤖 telegram_bot/                 # Telegram бот
│   ├── 📄 __init__.py
│   ├── 📄 main.py                   # Точка входа бота
│   ├── 📄 config.py                 # Конфиг бота
│   ├── 📄 api_client.py             # Клиент для работы с API
│   │
│   ├── 📁 handlers/                 # Обработчики сообщений
│   │   ├── 📄 __init__.py
│   │   ├── 📄 start.py
│   │   ├── 📄 registration.py
│   │   └── 📄 common.py
│   │
│   ├── 📁 keyboards/                # Клавиатуры бота
│   │   ├── 📄 __init__.py
│   │   ├── 📄 main_menu.py
│   │   └── 📄 registration.py
│   │
│   └── 📁 states/                   # Состояния бота
│       ├── 📄 __init__.py
│       └── 📄 registration_states.py
│
├── 🌐 web_portal/                   # Веб-портал для охранников
│   ├── 📄 index.html
│   ├── 📄 login.html
│   ├── 📄 dashboard.html
│   │
│   ├── 📁 css/
│   │   ├── 📄 styles.css
│   │   ├── 📄 reset.css
│   │   └── 📄 components.css
│   │
│   ├── 📁 js/
│   │   ├── 📄 app.js
│   │   ├── 📄 auth.js
│   │   └── 📄 api.js
│   │
│   └── 📁 assets/
│       ├── 📁 images/
│       └── 📁 icons/
│
├── 🧪 tests/                        # Тесты
│   ├── 📄 __init__.py
│   ├── 📄 conftest.py               # Фикстуры pytest
│   │
│   ├── 📁 unit/
│   │   ├── 📄 test_users.py
│   │   └── 📄 test_organizations.py
│   │
│   └── 📁 integration/
│       └── 📄 test_registration_flow.py
│
├── 📜 scripts/                      # Вспомогательные скрипты
│   ├── 📄 seed_database.py          # Наполнение тестовыми данными
│   ├── 📄 check_database.py         # Проверка целостности БД
│   └── 📄 create_test_qr.py         # Генерация тестовых QR-кодов
│
├── 📁 docs/                         # Документация
│   ├── 📄 API_DOCUMENTATION.md
│   ├── 📄 BOT_USAGE.md
│   ├── 📄 DATABASE_SCHEMA.md
│   └── 📄 TEST_DATA.md
│
├── 🔧 .github/                      # GitHub Actions
│   └── 📁 workflows/
│       └── 📄 python-tests.yml
│
└── 📁 instance/                     # Папка для SQLite базы (в .gitignore)
    └── 📄 app.db
```



# 🤖 Telegram-бот с динамически обновляемыми QR-кодами

## 📋 Описание проекта

Этот бот генерирует и обновляет QR-коды в реальном времени.
Пользователь получает уникальный QR-код, который может изменяться по заданному алгоритму — например, для авторизации, отслеживания или одноразовых ссылок.


---

## 🚀 Возможности

- 🔄 **Динамическое обновление QR-кода** — код обновляется через заданный интервал или по событию.
- 👤 **Привязка к пользователю** — каждому пользователю Telegram выдается свой QR.
- 💬 **Интерактивное взаимодействие** — команды ...
- 🕒 **Поддержка таймеров и авто-обновления** (через asyncio / background tasks).
- ☁️ **Возможность хранения данных** (например, через SQLite, PostgreSQL или Redis).
- 🧩 **Расширяемая архитектура** — легко добавить новые типы QR (ссылки, токены, ID-карты и т.п.).

---

## ⚙️ Установка и запуск


### Установка:

```git clone https://github.com/SOKLY6/Project_safe_team.git```

```cd Project_safe_team```

### Чтобы перейти в нужную ветку:

```git switch branch_name```


### Настройка:

  ```sudo apt update```

  ```sudo apt install curl unzip -y```

  ```curl -LsSf https://astral.sh/uv/install.sh | sh```

  ```echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc```

  ```source ~/.bashrc```

  ```uv sync```

  ```source .venv/bin/activate```
