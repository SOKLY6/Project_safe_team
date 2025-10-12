import logging
import sys

logger = logging.getLogger('safe_team')
logger.setLevel(logging.DEBUG)

formatter = logging.Formatter(
    '[%(asctime)s] [%(levelname)s] %(name)s - %(message)s', '%Y-%m-%d %H:%M:%S'
)

console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(formatter)
console_handler.setLevel(logging.INFO)

file_handler = logging.FileHandler('app.log', encoding='utf-8')
file_handler.setFormatter(formatter)
file_handler.setLevel(logging.DEBUG)

logger.addHandler(console_handler)
logger.addHandler(file_handler)
