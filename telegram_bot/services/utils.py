import logging


def setup_logging() -> None:
    logging.basicConfig(
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        level=logging.INFO,
    )


def format_message(text: str) -> str:
    return f'✨ {text.upper()} ✨'
