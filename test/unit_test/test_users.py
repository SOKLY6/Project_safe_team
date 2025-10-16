"""
test_users.py
--------------
Тесты для операций с пользователями (User) без ForeignKey.
Проверяются следующие сценарии:
1. Создание пользователя (успешно)
2. Создание пользователя (ошибка валидации)
3. Получение пользователя по ID
"""

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.user import User


# ======================================================
# 1️⃣ Тест: успешное создание пользователя
# ======================================================
def test_create_user_success(db_session):
    """
    Проверяет успешное создание пользователя в базе данных.

    Шаги:
      1. Создаётся объект User с валидными данными.
      2. Сохраняется в базу данных.
      3. Проверяется, что пользователь добавлен и поля соответствуют ожиданиям.

    Args:
        db_session (Session): Тестовая сессия SQLAlchemy.
    """
    user = User(
        telegram_id=12345,
        name='Иван Иванов',
        organization='Тестовая организация'
    )

    db_session.add(user)
    db_session.commit()

    saved_user = db_session.query(User).filter_by(telegram_id=12345).first()
    assert saved_user is not None
    assert saved_user.name == 'Иван Иванов'
    assert saved_user.organization == 'Тестовая организация'


# ======================================================
# 2️⃣ Тест: создание пользователя — ошибка валидации
# ======================================================
def test_create_user_validation_error(db_session):
    """
    Проверяет, что при создании пользователя без обязательного поля name
    выбрасывается исключение IntegrityError.

    Шаги:
      1. Создаётся объект User с None в обязательном поле name.
      2. Пытается сохранить в базу.
      3. Ожидается IntegrityError.

    Args:
        db_session (Session): Тестовая сессия SQLAlchemy.
    """
    user = User(
        telegram_id=54321,
        name=None,  # обязательное поле
        organization='Организация'
    )

    db_session.add(user)
    with pytest.raises(IntegrityError):
        db_session.commit()


# ======================================================
# 3️⃣ Тест: получение пользователя по ID
# ======================================================
def test_get_user_by_id(db_session):
    """
    Проверяет корректность получения пользователя по ID.

    Шаги:
      1. Создаётся объект User.
      2. Сохраняется в базу.
      3. Выполняется поиск по ID.
      4. Проверяется, что возвращённый объект соответствует ожиданиям.

    Args:
        db_session (Session): Тестовая сессия SQLAlchemy.
    """
    user = User(
        telegram_id=11111,
        name='Тестовый пользователь',
        organization='Организация'
    )

    db_session.add(user)
    db_session.commit()

    fetched = db_session.get(User, user.id)
    assert fetched is not None
    assert fetched.name == 'Тестовый пользователь'
    assert fetched.organization == 'Организация'
