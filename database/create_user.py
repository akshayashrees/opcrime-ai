"""
Standalone utility: create individual demo users without reseeding
the full dataset. Run from the database/ folder or project root.
"""
import sys
import os

# Resolve project root relative to this file, not a hardcoded machine path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, "backend"))
os.chdir(os.path.join(PROJECT_ROOT, "backend"))

from app.services.auth_service import hash_password
from app.database import engine, Base
from app.models import User
from sqlalchemy.orm import sessionmaker

Base.metadata.create_all(bind=engine)
S = sessionmaker(bind=engine)()

users_data = [
    ('Citizen', 'citizen@opcrime.ai', 'citizen123', 'citizen'),
    ('Police', 'police@opcrime.ai', 'police123', 'police'),
    ('Municipal', 'municipal@opcrime.ai', 'municipal123', 'municipal'),
    ('Emergency', 'emergency@opcrime.ai', 'emergency123', 'emergency'),
    ('Planner', 'planner@opcrime.ai', 'planner123', 'planner'),
]

for name, email, pwd, role in users_data:
    existing = S.query(User).filter(User.email == email).first()
    if not existing:
        u = User(name=name, email=email, hashed_password=hash_password(pwd), role=role)
        S.add(u)
        print(f"Created: {email}")
    else:
        print(f"Already exists: {email}")

S.commit()
print("\nAll users ready!")
