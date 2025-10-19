"""
test_organizations.py
---------------------
Тесты для операций с организациями (Organization).

Проверяются следующие сценарии:
1. Создание организации (успешно)
2. Создание организации (ошибка валидации)
3. Получение всех организаций
"""

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.organization import Organization


# ======================================================
# 1️⃣ Тест: успешное создание организации
# ======================================================
def test_create_organization_success(db_session):
    """
    Проверяет успешное создание новой организации.

    Шаги:
      1. Создаётся объект Organization с валидным названием.
      2. Сохраняется в базу данных.
      3. Проверяется, что объект добавлен и поля соответствуют ожиданиям.

    Args:
        db_session (Session): Тестовая сессия SQLAlchemy.
    """
    org = Organization(name='Тестовая организация')
    db_session.add(org)
    db_session.commit()

    saved_org = (
        db_session.query(Organization)
        .filter_by(name='Тестовая организация')
        .first()
    )
    assert saved_org is not None
    assert saved_org.name == 'Тестовая организация'


# ======================================================
# 2️⃣ Тест: создание организации — ошибка валидации
# ======================================================
def test_create_organization_validation_error(db_session):
    """
    Проверяет, что создание организации без имени вызывает IntegrityError.

    Шаги:
      1. Создаётся объект Organization с name=None.
      2. Пытается сохранить в базу.
      3. Ожидается IntegrityError.

    Args:
        db_session (Session): Тестовая сессия SQLAlchemy.
    """
    org = Organization(name=None)
    db_session.add(org)
    with pytest.raises(IntegrityError):
        db_session.commit()


# ======================================================
# 3️⃣ Тест: получение всех организаций
# ======================================================
def test_get_all_organizations(db_session):
    """
    Проверяет корректность получения списка всех организаций из базы.

    Шаги:
      1. Создаётся несколько объектов Organization.
      2. Сохраняются в базу.
      3. Выполняется запрос всех объектов.
      4. Проверяется количество и корректность названий.

    Args:
        db_session (Session): Тестовая сессия SQLAlchemy.
    """
    names = ['Университет', 'Компания', 'Школа']
    for n in names:
        db_session.add(Organization(name=n))
    db_session.commit()

    result = db_session.query(Organization).all()
    assert len(result) == len(names)
    result_names = [o.name for o in result]
    for n in names:
        assert n in result_names
