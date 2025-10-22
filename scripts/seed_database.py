import os
import random
import sys

from sqlalchemy.orm import Session

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from io import BytesIO

import qrcode

from app.database import Base, SessionLocal, engine
from app.models import AccessLog, Organization, QRCode, User


def create_tables() -> None:
    """Создание таблиц в базе данных"""
    Base.metadata.create_all(bind=engine)


def generate_qr_code_data(user_id: int, organization_id: int) -> str:
    """Генерация данных для QR-кода"""
    return f'USER:{user_id}:ORG:{organization_id}:{random.randint(1000, 9999)}'


def create_qr_code_for_user(
    db: Session, user_id: int, organization_id: int
) -> QRCode:
    """Создание QR-кода для пользователя"""
    qr_data = generate_qr_code_data(user_id, organization_id)

    # Генерация QR-кода как изображение (опционально)
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)

    # Сохранение в байтовый поток (можно сохранить в файл при необходимости)
    qr_image = qr.make_image(fill_color='black', back_color='white')
    img_buffer = BytesIO()
    qr_image.save(img_buffer, format='PNG')
    img_buffer.seek(0)

    # Создание записи в базе данных
    qr_code = QRCode(
        code=qr_data, user_id=user_id, organization_id=organization_id
    )

    db.add(qr_code)
    db.commit()
    db.refresh(qr_code)

    print(f'Создан QR-код для пользователя {user_id}: {qr_data}')
    return qr_code


def seed_database() -> None:
    """Основная функция для заполнения базы данных тестовыми данными"""
    db = SessionLocal()

    try:
        # Создание таблиц
        create_tables()
        print('Таблицы созданы успешно')

        # 1. Создание организаций (3 типа)
        organizations_data = [
            # Образовательные учреждения
            {'name': 'Университет ИТМО', 'type': 'educational'},
            {'name': 'СПбГУ', 'type': 'educational'},
            # Бизнес-организации
            {'name': 'Яндекс', 'type': 'business'},
            {'name': 'Сбер', 'type': 'business'},
            # Государственные учреждения
            {'name': 'Администрация СПб', 'type': 'government'},
            {'name': 'Городская больница №1', 'type': 'government'},
        ]

        organizations = []
        for org_data in organizations_data:
            organization = Organization(name=org_data['name'])
            db.add(organization)
            organizations.append(organization)

        db.commit()
        for org in organizations:
            db.refresh(org)

        print('Организации созданы успешно')

        # 2. Создание 10 тестовых пользователей
        users_data = [
            # Студенты
            {
                'name': 'Иванов Иван Иванович',
                'telegram_id': 100001,
                'organization_id': 1,
                'role': 'student',
            },
            {
                'name': 'Петров Петр Петрович',
                'telegram_id': 100002,
                'organization_id': 1,
                'role': 'student',
            },
            {
                'name': 'Сидорова Анна Сергеевна',
                'telegram_id': 100003,
                'organization_id': 2,
                'role': 'student',
            },
            # Преподаватели
            {
                'name': 'Кузнецов Алексей Владимирович',
                'telegram_id': 100004,
                'organization_id': 1,
                'role': 'professor',
            },
            {
                'name': 'Николаева Мария Петровна',
                'telegram_id': 100005,
                'organization_id': 2,
                'role': 'professor',
            },
            # Сотрудники бизнеса
            {
                'name': 'Смирнов Дмитрий Олегович',
                'telegram_id': 100006,
                'organization_id': 3,
                'role': 'developer',
            },
            {
                'name': 'Волкова Екатерина Игоревна',
                'telegram_id': 100007,
                'organization_id': 3,
                'role': 'manager',
            },
            # Государственные служащие
            {
                'name': 'Федоров Сергей Александрович',
                'telegram_id': 100008,
                'organization_id': 5,
                'role': 'official',
            },
            {
                'name': 'Морозова Ольга Викторовна',
                'telegram_id': 100009,
                'organization_id': 6,
                'role': 'doctor',
            },
            # Без организации (тестовый охранник)
            {
                'name': 'Охранник Тестовый',
                'telegram_id': 100010,
                'organization_id': None,
                'role': 'security',
            },
        ]

        users = []
        for user_data in users_data:
            user = User(
                name=user_data['name'],
                telegram_id=user_data['telegram_id'],
                organization_id=user_data['organization_id'],
            )
            db.add(user)
            users.append(user)

        db.commit()
        for user in users:
            db.refresh(user)

        print('Пользователи созданы успешно')

        # 3. Создание QR-кодов для пользователей (кроме охранника)
        for user in users:
            if user.organization_id:  # Только для пользователей с организацией
                # Используем значения напрямую без переопределения типов
                create_qr_code_for_user(db, user.id, user.organization_id)  # type: ignore

        print('QR-коды созданы успешно')

        # 4. Создание тестовых записей доступа (access logs)
        for _i in range(20):
            user = random.choice([u for u in users if u.organization_id])
            qr_code = db.query(QRCode).filter_by(user_id=user.id).first()

            if qr_code:
                access_log = AccessLog(
                    user_id=user.id,  # type: ignore
                    organization_id=user.organization_id,  # type: ignore
                    qr_code_id=qr_code.id,  # type: ignore
                )
                db.add(access_log)

        db.commit()
        print('Записи доступа созданы успешно')

        print('\n✅ База данных успешно заполнена тестовыми данными!')

        # Вывод статистики
        print('\n📊 Статистика:')
        print(f'Организации: {db.query(Organization).count()}')
        print(f'Пользователи: {db.query(User).count()}')
        print(f'QR-коды: {db.query(QRCode).count()}')
        print(f'Записи доступа: {db.query(AccessLog).count()}')

    except Exception as e:
        db.rollback()
        print(f'❌ Ошибка при заполнении базы данных: {e}')
        raise
    finally:
        db.close()


def add_user_qr_code(
    db: Session, user_id: int, organization_id: int
) -> QRCode:
    """Функция для добавления QR-кода пользователю"""
    return create_qr_code_for_user(db, user_id, organization_id)


if __name__ == '__main__':
    seed_database()
