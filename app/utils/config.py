from decouple import Csv, config


class Settings:
    PROJECT_NAME: str = 'QR Access System'
    DEBUG: bool = config('DEBUG_API', default=True, cast=bool)

    DB_FILE: str = config('DB_FILE', default='./test.db')
    SQLALCHEMY_DATABASE_URL: str = f'sqlite:///{DB_FILE}'

    ALLOWED_ORIGINS: list[str] = config(
        'ALLOWED_ORIGINS', default='*', cast=Csv()
    )


settings = Settings()
