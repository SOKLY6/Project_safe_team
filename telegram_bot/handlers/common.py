from telegram import Update
from telegram.ext import ContextTypes, CommandHandler, MessageHandler, filters
from Project_safe_team.telegram_bot.handlers.qr_generator import generate_qr_code

async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = """
                📋 Доступные команды:
                
                /start - Запустить бота
                /help - Показать справку
                
                Или используйте кнопки меню!
                """
    await update.message.reply_text(help_text)

async def show_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("📊 Статистика: Пока что данных нет")

async def qr_generation(update: Update, context: ContextTypes.DEFAULT_TYPE):
    '''if context.args:
        data = " ".join(context.args)
    else:
        data = "Пример: /qr ваш_текст_для_кодирования"
        await update.message.reply_text(data)
        return'''
    data = "TOP IT"
    qr_image = generate_qr_code(data)
    await update.message.reply_photo(qr_image, caption=f"QR для: {data}")


async def profile(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("В данный момент ваш профиль еще не сформирован")

def setup_common_handlers(application):
    application.add_handler(CommandHandler("help", cmd_help))
    application.add_handler(MessageHandler(filters.Regex("🆘 Помощь"), cmd_help))
    application.add_handler(MessageHandler(filters.Regex("📊 Статистика"), show_stats))
    application.add_handler(MessageHandler(filters.Regex("🆔 Мой QR-код"), qr_generation))
    application.add_handler(MessageHandler(filters.Regex("👤 Профиль"), profile))