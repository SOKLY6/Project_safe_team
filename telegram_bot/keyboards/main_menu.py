from telegram import (  # type: ignore[attr-defined]
    KeyboardButton,
    ReplyKeyboardMarkup,
)


def get_main_keyboard() -> ReplyKeyboardMarkup:
    keyboard = [
        [KeyboardButton('🆘 Помощь'), KeyboardButton('👤 Профиль')],
        [KeyboardButton('📊 Статистика'), KeyboardButton('🆔 Мой QR-код')],
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)


def get_guest_keyboard() -> ReplyKeyboardMarkup:
    keyboard = [[KeyboardButton('🔐 Вход')]]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
