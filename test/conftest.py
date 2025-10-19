"""
conftest.py
------------
Общие фикстуры для тестов проекта Safe Team.

Создаёт тестовую базу данных SQLite в памяти и предоставляет
фикстуру `db_session` для использования в тестах.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base


@pytest.fixture(scope='function')
def db_session():
    """
    Фикстура для создания тестовой сессии SQLAlchemy.

    Каждому тесту предоставляется отдельная база данных в памяти.
    После выполнения теста сессия закрывается, данные удаляются.

    Yields:
        sqlalchemy.orm.Session: активная тестовая сессия
    """
    engine = create_engine(
        'sqlite:///:memory:', connect_args={'check_same_thread': False}
    )
    TestingSessionLocal = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
