import io

import qrcode
from telegram import Update  # type: ignore[attr-defined]
from telegram.ext import (  # type: ignore[attr-defined]
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)
from telegram.ext import Application  # type: ignore[attr-defined]

from telegram_bot.keyboards.main_menu import get_guest_keyboard
from telegram_bot.services.api_client import api_client


async def cmd_help(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    help_text = (
        "📋 Доступные команды:\n\n"
        "/start - Запустить бота\n"
        "/help - Показать справку\n"
        "/cancel - Отменить текущее действие\n\n"
        "🔹 Зарегистрированным пользователям:\n"
        "📊 Статистика - посмотреть статистику\n"
        "🆔 Мой QR-код - сгенерировать QR-код\n"
        "👤 Профиль - информация о профиле\n"
    )
    assert update.message is not None
    await update.message.reply_text(help_text)


async def show_stats(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    telegram_id = update.effective_user.id
    user = await api_client.get_user_by_telegram_id(telegram_id)

    assert update.message is not None
    if not user:
        await update.message.reply_text(
            "❌ Вы не зарегистрированы.\n"
            'Нажмите "📝 Регистрация" для начала работы.',
            reply_markup=get_guest_keyboard(),
        )
        return

    qr_codes = await api_client.get_user_qr_codes(user["id"])
    total_qr = len(qr_codes)
    used_qr = sum(1 for qr in qr_codes if qr.get("used", False))
    active_qr = total_qr - used_qr

    stats_text = (
        "📊 Ваша статистика:\n\n"
        f"👤 Имя: {user['name']}\n"
        f"🏢 Организация ID: {user.get('organization_id', 'Не указана')}\n"
        f"📝 Всего QR сгенерировано: {total_qr}\n"
        f"✅ Использовано: {used_qr}\n"
        f"🔄 Активных: {active_qr}\n"
    )

    await update.message.reply_text(stats_text)


async def qr_generation(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    telegram_id = update.effective_user.id
    user = await api_client.get_user_by_telegram_id(telegram_id)

    assert update.message is not None
    if not user:
        await update.message.reply_text(
            "❌ Вы не зарегистрированы.\n"
            'Нажмите "📝 Регистрация" для начала работы.',
            reply_markup=get_guest_keyboard(),
        )
        return

    qr_data = await api_client.generate_qr_code(
        user["id"],
        user.get("organization_id", 1),
    )

    if not qr_data:
        await update.message.reply_text("❌ Ошибка генерации QR кода")
        return

    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data["code"])
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    bio = io.BytesIO()
    img.save(bio, "PNG")
    bio.seek(0)

    await update.message.reply_photo(
        photo=bio,
        caption=f'✅ QR-код действителен 1 минуту\n👤 Имя: {user["name"]}',
    )


async def profile(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    telegram_id = update.effective_user.id
    user = await api_client.get_user_by_telegram_id(telegram_id)

    assert update.message is not None
    if not user:
        await update.message.reply_text(
            "❌ Вы не зарегистрированы.\n"
            'Нажмите "📝 Регистрация" для начала работы.',
            reply_markup=get_guest_keyboard(),
        )
        return

    profile_text = (
        "👤 Ваш профиль:\n\n"
        f"📝 ФИО: {user['name']}\n"
        f"🆔 Telegram ID: {user['telegram_id']}\n"
        f"🏢 Организация ID: {user.get('organization_id', 'Не указана')}\n"
    )

    await update.message.reply_text(profile_text)


def setup_common_handlers(application: Application) -> None:
    application.add_handler(CommandHandler("help", cmd_help))
    application.add_handler(
        MessageHandler(filters.Regex("🆘 Помощь"), cmd_help)
    )
    application.add_handler(
        MessageHandler(filters.Regex("📊 Статистика"), show_stats)
    )
    application.add_handler(
        MessageHandler(filters.Regex("🆔 Мой QR-код"), qr_generation)
    )
    application.add_handler(
        MessageHandler(filters.Regex("👤 Профиль"), profile)
    )
