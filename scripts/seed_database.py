"""
seed_database.py
-----------------
Скрипт для безопасного и идемпотентного заполнения тестовой базы данных проекта Safe Team.

Функциональность:
- Создание организаций, пользователей и охранников
- Генерация QR-кодов с безопасными токенами
- Проверка целостности данных
- Создание отчёта о тестовых данных
- Возможность полной очистки БД перед заполнением (через RESET_DB)

Автор: команда Safe Team
Дата: 2025-10-16
"""

import os
import random
import string
from datetime import datetime

import qrcode
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models import Organization, User

# === Конфигурация ===
RESET_DB = True           # ⚠️ Если True — очищает БД перед заполнением
QR_DIR = 'qr_codes'
os.makedirs(QR_DIR, exist_ok=True)


# === Вспомогательные функции ===

def random_string(n: int = 12) -> str:
    """
    Генерирует случайную строку, используемую как безопасный токен QR-кода.

    Args:
        n (int): Длина генерируемой строки (по умолчанию 12).

    Returns:
        str: Случайная строка из букв и цифр.
    """
    return ''.join(random.choices(string.ascii_letters + string.digits, k=n))


def reset_database() -> None:
    """
    Полностью очищает и пересоздаёт структуру базы данных.

    Используется при первом запуске или при необходимости сбросить тестовые данные.
    Удаляет все таблицы и создаёт их заново на основе моделей SQLAlchemy.
    """
    print('⚠️ Очистка базы данных...')
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print('✅ База данных сброшена.')


def create_organizations(session: Session) -> list[Organization]:
    """
    Создаёт набор тестовых организаций, если они ещё не существуют.

    Args:
        session (Session): Активная сессия SQLAlchemy.

    Returns:
        list[Organization]: Список объектов созданных или найденных организаций.
    """
    org_names = [
        'Университет Технологий',
        'Академия Наук',
        'Школа №15',
        'Компания Альфа',
        'Компания Бета',
        'IT-Кластер'
    ]
    organizations = []

    for name in org_names:
        existing = session.query(Organization).filter_by(name=name).first()
        if existing:
            organizations.append(existing)
            continue
        org = Organization(name=name)
        session.add(org)
        organizations.append(org)

    session.commit()
    print(f'✅ Организаций в БД: {len(organizations)}')
    return organizations


def create_users(session: Session, organizations: list[Organization]) -> list[User]:
    """
    Создаёт 10 тестовых пользователей, распределяя их по организациям.

    Пользователи не дублируются: при повторном запуске те же telegram_id будут пропущены.

    Args:
        session (Session): Активная сессия SQLAlchemy.
        organizations (list[Organization]): Список организаций для распределения пользователей.

    Returns:
        list[User]: Список созданных или найденных пользователей.
    """
    roles = ['Студент', 'Преподаватель', 'Сотрудник', 'Инженер']
    users = []

    for i in range(10):
        telegram_id = 100000 + i
        existing = session.query(User).filter_by(telegram_id=telegram_id).first()
        if existing:
            users.append(existing)
            continue

        org = random.choice(organizations)
        role = random.choice(roles)
        user = User(
            telegram_id=telegram_id,
            name=f'Тест {role} {i+1}',
            role=role,
            organization_id=org.id,
            qr_token=random_string(16)
        )
        session.add(user)
        users.append(user)

    session.commit()
    print(f'✅ Пользователей в БД: {len(users)}')
    return users


def create_guards(session: Session, organizations: list[Organization]) -> list[User]:
    """
    Создаёт тестовых охранников, связанных с разными организациями.

    При повторных запусках не дублирует охранников (проверка по telegram_id).

    Args:
        session (Session): Активная сессия SQLAlchemy.
        organizations (list[Organization]): Список организаций.

    Returns:
        list[User]: Список созданных или найденных охранников.
    """
    guards = []

    for i in range(3):
        telegram_id = 200000 + i
        existing = session.query(User).filter_by(telegram_id=telegram_id).first()
        if existing:
            guards.append(existing)
            continue

        org = random.choice(organizations)
        guard = User(
            telegram_id=telegram_id,
            name=f'Охранник {org.name}',
            role='Охранник',
            organization_id=org.id,
            qr_token=random_string(16)
        )
        session.add(guard)
        guards.append(guard)

    session.commit()
    print(f'✅ Охранников в БД: {len(guards)}')
    return guards


def generate_qr_for_user(user: User) -> str:
    """
    Генерирует QR-код для пользователя на основе безопасного токена.

    QR-код не содержит личных данных, только токен для дальнейшей верификации.

    Args:
        user (User): Объект пользователя, для которого создаётся QR.

    Returns:
        str: Путь к сохранённому файлу QR-кода (PNG).
    """
    qr_data = f'SAFE_TEAM_USER_TOKEN:{user.qr_token}'
    img = qrcode.make(qr_data)
    path = os.path.join(QR_DIR, f'user_{user.id}.png')
    img.save(path)
    return path


def assign_qr_codes(session: Session, users: list[User]) -> None:
    """
    Генерирует QR-коды для всех пользователей и сохраняет пути в базу.

    Если у пользователя уже есть QR-файл, повторная генерация пропускается.

    Args:
        session (Session): Активная сессия SQLAlchemy.
        users (list[User]): Список пользователей, для которых генерируются QR-коды.
    """
    for user in users:
        if user.qr_code_path and os.path.exists(user.qr_code_path):
            continue
        path = generate_qr_for_user(user)
        user.qr_code_path = path
    session.commit()
    print('✅ QR-коды созданы и сохранены.')


def verify_integrity(session: Session) -> None:
    """
    Проверяет целостность данных после заполнения базы.

    Проверки:
      - Количество пользователей ≥ 10
      - Количество организаций ≥ 6
      - У каждого пользователя есть QR-файл на диске

    Args:
        session (Session): Активная сессия SQLAlchemy.

    Raises:
        AssertionError: Если какое-либо условие не выполняется.
    """
    users = session.query(User).all()
    orgs = session.query(Organization).all()
    missing_qr = [u for u in users if not u.qr_code_path or not os.path.exists(u.qr_code_path)]

    assert len(users) >= 10, '❌ Недостаточно пользователей!'
    assert len(orgs) >= 6, '❌ Недостаточно организаций!'
    assert not missing_qr, f'❌ У {len(missing_qr)} пользователей отсутствуют QR-коды.'

    print(f'🔍 Проверка пройдена: {len(users)} пользователей, {len(orgs)} организаций, QR-коды в порядке.')


def generate_report(users: list[User], organizations: list[Organization], guards: list[User]) -> None:
    """
    Формирует Markdown-файл с отчётом о созданных тестовых данных.

    Файл содержит:
      - список организаций,
      - список пользователей и их организаций,
      - список охранников,
      - пути к QR-кодам.

    Args:
        users (list[User]): Список пользователей.
        organizations (list[Organization]): Список организаций.
        guards (list[User]): Список охранников.
    """
    with open('seed_report.md', 'w', encoding='utf-8') as f:
        f.write('# Отчёт по тестовым данным Safe Team\n\n')
        f.write(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        f.write('## Организации\n')
        for o in organizations:
            f.write(f'- {o.name}\n')

        f.write('\n## Пользователи\n')
        for u in users:
            f.write(f'- {u.name} ({u.role}) — {u.organization_rel.name} | QR: {u.qr_code_path}\n')

        f.write('\n## Охранники\n')
        for g in guards:
            f.write(f'- {g.name} — {g.organization_rel.name} | QR: {g.qr_code_path}\n')

    print('📄 seed_report.md создан.')


def main() -> None:
    """
    Главная точка входа в скрипт.

    Последовательно выполняет:
      1. (Опционально) сброс базы данных
      2. Создание организаций
      3. Создание пользователей
      4. Создание охранников
      5. Генерацию QR-кодов
      6. Проверку целостности
      7. Генерацию отчёта

    При ошибках выполняет откат транзакции и завершает сессию.
    """
    if RESET_DB:
        reset_database()
    else:
        Base.metadata.create_all(bind=engine)

    session = SessionLocal()

    try:
        organizations = create_organizations(session)
        users = create_users(session, organizations)
        guards = create_guards(session, organizations)
        assign_qr_codes(session, users + guards)
        verify_integrity(session)
        generate_report(users, organizations, guards)
        print('🎉 База данных успешно заполнена.')
    except SQLAlchemyError as e:
        session.rollback()
        print(f'❌ Ошибка при выполнении операции: {e}')
    finally:
        session.close()


if __name__ == '__main__':
    main()


