import logging
import os
from dotenv import load_dotenv
from telegram.ext import Application

load_dotenv()

# Импорты из наших модулей
from handlers.start import setup_start_handlers
from handlers.common import setup_common_handlers
from services.utils import setup_logging


def main():
    setup_logging()

    BOT_TOKEN = os.getenv('BOT_TOKEN')
    if not BOT_TOKEN:
        raise ValueError("BOT_TOKEN не найден. Проверьте файл .env")

    application = Application.builder().token(BOT_TOKEN).build()

    # Настройка обработчиков
    setup_start_handlers(application)
    setup_common_handlers(application)

    print("Бот запущен...")
    application.run_polling()


if __name__ == "__main__":
    main()