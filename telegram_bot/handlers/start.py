from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    filters,
)

from telegram_bot.keyboards.main_menu import (
    get_guest_keyboard,
    get_main_keyboard,
)
from telegram_bot.services.api_client import api_client

WAITING_LOGIN, WAITING_PASSWORD = range(2)


async def start_command(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    telegram_id = update.effective_user.id
    existing_user = await api_client.get_user_by_telegram_id(telegram_id)

    assert update.message is not None
    if existing_user:
        await update.message.reply_text(
            f'✅ Добро пожаловать, {existing_user["name"]}!\n'
            'Выберите действие в меню:',
            reply_markup=get_main_keyboard(),
        )
    else:
        await update.message.reply_text(
            '👋 Добро пожаловать в генератор QR-пропусков!\n\n'
            '❌ Вы не авторизованы.\n'
            'Нажмите "🔐 Вход" для авторизации.',
            reply_markup=get_guest_keyboard(),
        )


async def start_login(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.effective_user.id
    existing_user = await api_client.get_user_by_telegram_id(telegram_id)

    assert update.message is not None
    if existing_user:
        await update.message.reply_text(
            f'✅ Вы уже авторизованы как {existing_user["name"]}',
            reply_markup=get_main_keyboard(),
        )
        return ConversationHandler.END

    await update.message.reply_text('🔐 Введите ваш логин:')
    return WAITING_LOGIN


async def process_login(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['login'] = update.message.text.strip()
    await update.message.reply_text('🔑 Введите пароль:')
    return WAITING_PASSWORD


async def process_password(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.effective_user.id
    username = context.user_data['login']
    password = update.message.text

    user = await api_client.login_user(username, password)
    if not user:
        await update.message.reply_text(
            '❌ Неверный логин или пароль.\nВведите логин заново:'
        )
        return WAITING_LOGIN

    existing = await api_client.get_user_by_telegram_id(telegram_id)
    if existing:
        await update.message.reply_text(
            '❌ Этот Telegram аккаунт уже привязан к пользователю.',
            reply_markup=get_guest_keyboard(),
        )
        return ConversationHandler.END

    bound = await api_client.bind_telegram(user['id'], telegram_id)
    if bound:
        await update.message.reply_text(
            f'✅ Авторизация успешна!\n\n'
            f'👤 Имя: {user["name"]}\n\n'
            f'Теперь вы можете пользоваться всеми функциями бота!',
            reply_markup=get_main_keyboard(),
        )
    else:
        await update.message.reply_text(
            '❌ Аккаунт уже привязан.\n',
            reply_markup=get_guest_keyboard(),
        )

    return ConversationHandler.END


async def cancel_login(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        'Авторизация отменена.',
        reply_markup=get_guest_keyboard(),
    )
    return ConversationHandler.END


async def cancel_registration(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> int:
    assert update.message is not None
    await update.message.reply_text(
        'Регистрация отменена.',
        reply_markup=get_guest_keyboard(),
    )
    return ConversationHandler.END


def setup_start_handlers(application: Application) -> None:
    application.add_handler(CommandHandler('start', start_command))

    login_handler = ConversationHandler(
        entry_points=[MessageHandler(filters.Regex('🔐 Вход'), start_login)],
        states={
            WAITING_LOGIN: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, process_login)
            ],
            WAITING_PASSWORD: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND,
                    process_password,
                )
            ],
        },
        fallbacks=[CommandHandler('cancel', cancel_login)],
    )

    application.add_handler(login_handler)
