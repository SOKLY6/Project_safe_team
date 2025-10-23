from telegram import ReplyKeyboardMarkup, KeyboardButton

def get_main_keyboard():
    keyboard = [
        [KeyboardButton("🆘 Помощь"), KeyboardButton("👤 Профиль")],
        [KeyboardButton("📊 Статистика"), KeyboardButton("🆔 Мой QR-код")]
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)