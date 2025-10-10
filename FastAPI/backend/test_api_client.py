from .database import SessionLocal
from . import models

# Создаем сессию
db = SessionLocal()

# Создаем объекты организаций
org1 = models.Organization(name="safe_team")
org2 = models.Organization(name="dev_team")
org3 = models.Organization(name="qa_team")

# Добавляем в сессию
db.add_all([org1, org2, org3])

# Сохраняем изменения
db.commit()

# Закрываем соединение
db.close()

print("✅ Тестовые данные добавлены в таблицу organizations.")
