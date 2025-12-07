from telegram import KeyboardButton, ReplyKeyboardMarkup


def get_main_keyboard():
    keyboard = [
        [KeyboardButton('🆘 Помощь'), KeyboardButton('👤 Профиль')],
        [KeyboardButton('📊 Статистика'), KeyboardButton('🆔 Мой QR-код')],
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)


def get_guest_keyboard():
    keyboard = [
        [KeyboardButton('🔐 Вход')],
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
