from sqlalchemy import select
from telegram import Update
from telegram.ext import (
    ContextTypes,
)

from app.database import async_session
from app.models.user import User


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

        # Находим последний активный QR для этого юзера (например, не использованный и не протухший)
        qr_result = await session.execute(
            select(QRCode)
            .filter(
                QRCode.user_id == user.id,
                QRCode.used == False,
                QRCode.expires_at > datetime.utcnow(),
            )
            .order_by(QRCode.created_at.desc())
        )
        qr_code_record = qr_result.scalars().first()

        if qr_code_record is None:
            await update.message.reply_text(
                'У вас нет доступных QR-кодов. Сгенерируйте новый.'
            )
            return

        qr_code_str = (
            qr_code_record.code
        )  # Именно по этому "хэшу" строим QR-картинку!

        import io

        import qrcode

        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_code_str)
        qr.make(fit=True)

        img = qr.make_image(fill_color='black', back_color='white')
        bio = io.BytesIO()
        img.save(bio, 'PNG')
        bio.seek(0)

        lifetime = (
            qr_code_record.expires_at - qr_code_record.created_at
        ).total_seconds() // 60
        await update.message.reply_photo(
            photo=bio,
            caption=f'✅ QR-код из базы (code): {qr_code_str}\nИмя: {user.name}\nДействует минут: {int(lifetime)}',
        )
