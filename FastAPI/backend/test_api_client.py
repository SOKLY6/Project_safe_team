from .database import SessionLocal
from . import models

db = SessionLocal()

org1 = models.Organization(name="safe_team")
org2 = models.Organization(name="dev_team")
org3 = models.Organization(name="qa_team")

db.add_all([org1, org2, org3])

db.commit()

db.close()

print("✅ Тестовые данные добавлены в таблицу organizations.")
