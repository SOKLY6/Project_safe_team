from telegram import Update, ReplyKeyboardMarkup
from telegram.ext import ContextTypes, CommandHandler, MessageHandler, filters, ConversationHandler
from Project_safe_team.telegram_bot.keyboards.main_menu import get_main_keyboard

WAITING_FOR_NAME, WAITING_FOR_ORG = range(2)
ORGANIZATIONS = ["МАИ", "НЕ МАИ", "ЕЩЕ НЕ МАИ"]

async def start_registration(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🤖 Добро пожаловать в генератор QR-пропусков!\n"
        "Для начала работы пройдите регистрацию!\n"
        "Пожалуйста, введите ваше ФИО:"
    )
    return WAITING_FOR_NAME

async def save_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['name'] = update.message.text.strip()
    await update.message.reply_text(
        "Выберите вашу организацию:",
        reply_markup=ReplyKeyboardMarkup(
            [[org] for org in ORGANIZATIONS], one_time_keyboard=True, resize_keyboard=True
        )
    )
    return WAITING_FOR_ORG

def check_user_in_database(name, organization):
    BASE = {"Андрей Светушкин": "МАИ", "Дима Пакет": "МАИ", "Kanye West": "ЕЩЕ НЕ МАИ"}
    if name in BASE.keys():
        if BASE[name] == organization:
            return True
        return False
    return False # вьебать связь с sql

async def save_organization_and_check(update: Update, context: ContextTypes.DEFAULT_TYPE):
    org = update.message.text
    name = context.user_data.get('name')
    if org not in ORGANIZATIONS:
        await update.message.reply_text(
            "Пожалуйста, выберите организацию из списка!"
        )
        return WAITING_FOR_ORG
    context.user_data['organization'] = org
    if check_user_in_database(name, org):
        await update.message.reply_text(
            f"✅ Спасибо, {name}!\nОрганизация: {org}.\nРегистрация завершена.",
            reply_markup=get_main_keyboard()
        )
        return ConversationHandler.END
    else:
        await update.message.reply_text(
            "❌ Не найдено совпадение ФИО или организации в базе. Попробуйте снова: \n"
            "Введите ФИО:"
        )
        return WAITING_FOR_NAME

async def cancel_registration(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Регистрация отменена.")
    return ConversationHandler.END

def setup_start_handlers(application):
    registration_handler = ConversationHandler(
        entry_points=[CommandHandler('start', start_registration)],
        states={
            WAITING_FOR_NAME: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, save_name)
            ],
            WAITING_FOR_ORG: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, save_organization_and_check)
            ]
        },
        fallbacks=[CommandHandler('cancel', cancel_registration)]
    )
    application.add_handler(registration_handler)
