class KeyboardButton:
    def __init__(self, text: str) -> None:
        pass


class ReplyKeyboardMarkup:
    def __init__(
        self,
        keyboard: list[list[KeyboardButton]],
        resize_keyboard: bool = False,
    ) -> None:
        pass


def get_main_keyboard() -> ReplyKeyboardMarkup:
    keyboard = [
        [KeyboardButton('🆘 Помощь'), KeyboardButton('👤 Профиль')],
        [KeyboardButton('📊 Статистика'), KeyboardButton('🆔 Мой QR-код')],
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)


def get_guest_keyboard() -> ReplyKeyboardMarkup:
    keyboard = [[KeyboardButton('🔐 Вход')]]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
