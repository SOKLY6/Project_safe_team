from decouple import config
from telegram.ext import Application

from telegram_bot.handlers.common import setup_common_handlers
from telegram_bot.handlers.start import setup_start_handlers
from telegram_bot.services.utils import setup_logging


def main():
    setup_logging()

    BOT_TOKEN = config('BOT_TOKEN')

    if not BOT_TOKEN:
        raise ValueError('BOT_TOKEN не найден. Проверьте файл .env')

    application = Application.builder().token(BOT_TOKEN).build()

    setup_start_handlers(application)
    setup_common_handlers(application)

    print('Бот запущен...')
    application.run_polling()


if __name__ in ('__main__', 'telegram_bot.main'):
    main()
