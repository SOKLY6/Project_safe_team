import logging


def setup_logging():
    logging.basicConfig(
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        level=logging.INFO,
    )


def format_message(text: str) -> str:
    """Форматирует текст сообщения"""
    return f'✨ {text.upper()} ✨'
