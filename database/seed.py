"""Seed the database with initial data from the generated CSV dataset."""
import sys
import os
import csv
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base
from backend.app.models import User, Location, CrimeRecord
from backend.app.services.auth_service import hash_password
from backend.app.config import settings

engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)


def create_tables():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")


def seed_default_users():
    """Create default users for each role."""
    session = Session()
    default_users = [
        {"name": "Citizen User", "email": "citizen@opcrime.ai", "password": "citizen123", "role": "citizen"},
        {"name": "Police Officer", "email": "police@opcrime.ai", "password": "police123", "role": "police"},
        {"name": "Municipal Admin", "email": "municipal@opcrime.ai", "password": "municipal123", "role": "municipal"},
        {"name": "Emergency Unit", "email": "emergency@opcrime.ai", "password": "emergency123", "role": "emergency"},
        {"name": "Urban Planner", "email": "planner@opcrime.ai", "password": "planner123", "role": "planner"},
        {"name": "NGO Worker", "email": "ngo@opcrime.ai", "password": "ngo123", "role": "ngo"},
    ]

    for u in default_users:
        existing = session.query(User).filter(User.email == u["email"]).first()
        if not existing:
            user = User(
                name=u["name"],
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                role=u["role"],
            )
            session.add(user)
            print(f"  Created user: {u['email']} ({u['role']})")

    session.commit()
    session.close()
    print("Default users seeded.")


def seed_locations_from_csv():
    """Load locations from the generated dataset."""
    csv_path = os.path.join(os.path.dirname(__file__), '..', 'ml', 'data', 'crime_dataset.csv')
    if not os.path.exists(csv_path):
        print(f"Dataset not found at {csv_path}. Run ml/generate_dataset.py first.")
        return

    session = Session()
    count = 0

    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            location = Location(
                city=row['city'],
                latitude=float(row['latitude']),
                longitude=float(row['longitude']),
                area_type=row['area_type'],
                population_density=int(float(row['population_density'])),
                lighting_score=float(row['lighting_score']),
                cctv_density=float(row['cctv_density']),
                patrol_frequency=float(row['police_patrol_frequency']),
                opcrime_score=float(row['opcrime_score']),
            )
            session.add(location)

            crime = CrimeRecord(
                location=location,
                crime_type=row['crime_type'],
                crime_probability=float(row['crime_probability']),
                opcrime_score=float(row['opcrime_score']),
            )
            session.add(crime)

            count += 1
            if count % 5000 == 0:
                session.commit()
                print(f"  Loaded {count} records...")

    session.commit()
    session.close()
    print(f"Seeded {count} locations and crime records.")


if __name__ == "__main__":
    print("=== OpCrime AI Database Seeder ===")
    create_tables()
    seed_default_users()
    seed_locations_from_csv()
    print("Done!")
