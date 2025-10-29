from telegram import Update
from telegram.ext import CommandHandler, ContextTypes, MessageHandler, filters


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = """
                📋 Доступные команды:
                
                /start - Запустить бота
                /help - Показать справку
                
                Или используйте кнопки меню!
                """
    await update.message.reply_text(help_text)


async def show_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text('📊 Статистика: Пока что данных нет')


async def qr_generation(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text('Пока что эта функция недоступна')


async def profile(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        'В данный момент ваш профиль еще не сформирован'
    )


def setup_common_handlers(application):
    application.add_handler(CommandHandler('help', cmd_help))
    application.add_handler(
        MessageHandler(filters.Regex('🆘 Помощь'), cmd_help)
    )
    application.add_handler(
        MessageHandler(filters.Regex('📊 Статистика'), show_stats)
    )
    application.add_handler(
        MessageHandler(filters.Regex('🆔 Мой QR-код'), qr_generation)
    )
    application.add_handler(
        MessageHandler(filters.Regex('👤 Профиль'), profile)
    )
