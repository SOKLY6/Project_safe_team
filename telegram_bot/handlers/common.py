import io
import os
import secrets
from datetime import datetime, timedelta, timezone

import qrcode
from app.database import async_session
from app.models.qr_code import QRCode
from app.models.user import User
from sqlalchemy import select
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
    telegram_id = update.effective_user.id

    async with async_session() as session:
        result = await session.execute(
            select(User).filter(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            await update.message.reply_text(
                '❌ Вы не зарегистрированы. Используйте /start'
            )
            return

        qr_result = await session.execute(
            select(QRCode).filter(QRCode.user_id == user.id)
        )
        qr_codes = qr_result.scalars().all()

        total_qr = len(qr_codes)
        used_qr = sum(1 for qr in qr_codes if qr.used)
        active_qr = sum(
            1
            for qr in qr_codes
            if not qr.used and (
                    (qr.expires_at.replace(tzinfo=timezone.utc) if qr.expires_at.tzinfo is None else qr.expires_at)
                    > datetime.now(timezone.utc)
            )
        )

        stats_text = f"""
📊 Ваша статистика:

👤 Имя: {user.name}
🏢 Организация ID: {user.organization_id}
📝 Всего QR сгенерировано: {total_qr}
✅ Использовано: {used_qr}
🔄 Активных: {active_qr}
"""
        await update.message.reply_text(stats_text)


async def qr_generation(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.effective_user.id

    async with async_session() as session:
        result = await session.execute(
            select(User).filter(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            await update.message.reply_text(
                '❌ Вы не зарегистрированы. Используйте /start'
            )
            return

        token = secrets.token_urlsafe(32)
        lifetime = int(os.getenv('QR_LIFETIME_MINUTES', '1'))
        expires = datetime.now(timezone.utc) + timedelta(minutes=lifetime)

        qr_code_record = QRCode(
            code=token,
            user_id=user.id,
            organization_id=user.organization_id or 1,
            expires_at=expires,
        )
        session.add(qr_code_record)
        await session.commit()

        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(token)
        qr.make(fit=True)

        img = qr.make_image(fill_color='black', back_color='white')

        bio = io.BytesIO()
        img.save(bio, 'PNG')
        bio.seek(0)

        await update.message.reply_photo(
            photo=bio,
            caption=f'✅ QR-код действителен {lifetime} минуту\nИмя: {user.name}',
        )


async def profile(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.effective_user.id

    async with async_session() as session:
        result = await session.execute(
            select(User).filter(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            await update.message.reply_text(
                '❌ Вы не зарегистрированы. Используйте /start'
            )
            return

        profile_text = f"""
👤 Ваш профиль:

📝 ФИО: {user.name}
🆔 Telegram ID: {user.telegram_id}
🏢 Организация ID: {user.organization_id if user.organization_id else 'Не указана'}
"""
        await update.message.reply_text(profile_text)


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
