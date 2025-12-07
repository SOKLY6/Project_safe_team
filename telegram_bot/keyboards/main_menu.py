from telegram import KeyboardButton, ReplyKeyboardMarkup  # type: ignore[attr-defined]


def get_main_keyboard() -> ReplyKeyboardMarkup:
    keyboard = [
        [KeyboardButton("🆘 Помощь"), KeyboardButton("👤 Профиль")],
        [KeyboardButton("📊 Статистика"), KeyboardButton("🆔 Мой QR-код")],
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)


def get_guest_keyboard() -> ReplyKeyboardMarkup:
    keyboard = [
        [KeyboardButton("📝 Регистрация")],
        [KeyboardButton("🆘 Помощь")],
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
