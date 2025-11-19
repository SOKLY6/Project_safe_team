import os

from decouple import config

BOT_TOKEN = config('BOT_TOKEN')

ADMIN_IDS = (
    list(map(int, os.getenv('ADMIN_IDS', '').split(',')))
    if os.getenv('ADMIN_IDS')
    else []
)
