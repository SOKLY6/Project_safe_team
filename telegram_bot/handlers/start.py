from typing import Any, cast

from telegram import ReplyKeyboardMarkup, Update  # type: ignore[attr-defined]
from telegram.ext import (  # type: ignore[attr-defined]
    CommandHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    filters,
)
from telegram.ext import Application  # type: ignore[attr-defined]

from telegram_bot.keyboards.main_menu import (
    get_guest_keyboard,
    get_main_keyboard,
)
from telegram_bot.services.api_client import api_client

WAITING_FOR_NAME, WAITING_FOR_ORG = range(2)


async def get_organizations_list() -> list[str]:
    orgs = await api_client.get_organizations()
    return [org["name"] for org in orgs]


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
            "Выберите действие в меню:",
            reply_markup=get_main_keyboard(),
        )
    else:
        await update.message.reply_text(
            "👋 Добро пожаловать в генератор QR-пропусков!\n\n"
            "❌ Вы не зарегистрированы.\n"
            'Нажмите "📝 Регистрация" для начала работы.',
            reply_markup=get_guest_keyboard(),
        )


async def start_registration(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> int:
    telegram_id = update.effective_user.id
    existing_user = await api_client.get_user_by_telegram_id(telegram_id)

    assert update.message is not None
    if existing_user:
        await update.message.reply_text(
            f'✅ Вы уже зарегистрированы как {existing_user["name"]}',
            reply_markup=get_main_keyboard(),
        )
        return ConversationHandler.END

    await update.message.reply_text(
        "📝 Регистрация нового пользователя\n\n"
        "Пожалуйста, введите ваше ФИО:",
    )
    return WAITING_FOR_NAME


async def save_name(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> int:
    assert update.message is not None
    user_data = cast(dict[str, Any], context.user_data)
    user_data["name"] = update.message.text.strip()

    organizations = await get_organizations_list()
    if not organizations:
        await update.message.reply_text(
            "❌ В базе нет организаций.\nОбратитесь к администратору.",
            reply_markup=get_guest_keyboard(),
        )
        return ConversationHandler.END

    await update.message.reply_text(
        "🏢 Выберите вашу организацию:",
        reply_markup=ReplyKeyboardMarkup(
            [[org] for org in organizations],
            one_time_keyboard=True,
            resize_keyboard=True,
        ),
    )
    return WAITING_FOR_ORG


async def save_organization_and_register(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> int:
    assert update.message is not None
    org_name = update.message.text

    user_data = cast(dict[str, Any], context.user_data)
    name = user_data.get("name")

    telegram_id = update.effective_user.id
    organizations = await api_client.get_organizations()
    org = next((o for o in organizations if o["name"] == org_name), None)

    if not org:
        await update.message.reply_text(
            "❌ Пожалуйста, выберите организацию из списка!",
        )
        return WAITING_FOR_ORG

    user = await api_client.register_user(telegram_id, str(name), org["id"])

    if user:
        await update.message.reply_text(
            "✅ Регистрация успешна!\n\n"
            f"👤 Имя: {name}\n"
            f"🏢 Организация: {org_name}\n\n"
            "Теперь вы можете пользоваться всеми функциями бота!",
            reply_markup=get_main_keyboard(),
        )
        return ConversationHandler.END

    await update.message.reply_text(
        "❌ Ошибка регистрации.\nПопробуйте позже.",
        reply_markup=get_guest_keyboard(),
    )
    return ConversationHandler.END


async def cancel_registration(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> int:
    assert update.message is not None
    await update.message.reply_text(
        "Регистрация отменена.",
        reply_markup=get_guest_keyboard(),
    )
    return ConversationHandler.END


def setup_start_handlers(application: Application) -> None:
    application.add_handler(CommandHandler("start", start_command))

    registration_handler = ConversationHandler(
        entry_points=[
            MessageHandler(
                filters.Regex("📝 Регистрация"),
                start_registration,
            )
        ],
        states={
            WAITING_FOR_NAME: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND,
                    save_name,
                )
            ],
            WAITING_FOR_ORG: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND,
                    save_organization_and_register,
                )
            ],
        },
        fallbacks=[CommandHandler("cancel", cancel_registration)],
    )

    application.add_handler(registration_handler)
