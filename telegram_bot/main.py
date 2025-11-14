from decouple import config
from telegram.ext import Application

from app.database import Base, engine
from telegram_bot.handlers.common import setup_common_handlers
from telegram_bot.handlers.start import setup_start_handlers
from telegram_bot.services.utils import setup_logging


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def post_init(application: Application):
    await init_db()
    print('База данных инициализирована')


def main():
    setup_logging()

    BOT_TOKEN = config('BOT_TOKEN')
    if not BOT_TOKEN:
        raise ValueError('BOT_TOKEN не найден. Проверьте файл .env')

    application = (
        Application.builder().token(BOT_TOKEN).post_init(post_init).build()
    )

    setup_start_handlers(application)
    setup_common_handlers(application)

    print('Бот запущен...')
    application.run_polling()


if __name__ == '__main__':
    main()
