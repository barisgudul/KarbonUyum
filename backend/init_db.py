#!/usr/bin/env python3
"""
Initialize the database by creating all tables directly using SQLAlchemy.
This bypasses Alembic migrations and is useful for quick local development setup.
"""

import sys
sys.path.append('/Users/baris/Desktop/Dev/KarbonUyum/backend')

from database import engine, Base
import models  # Import all models to ensure they're registered with Base

def init_db():
    """Create all database tables."""
    print("Creating all database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully!")
        print("\nCreated tables:")
        for table in Base.metadata.sorted_tables:
            print(f"  - {table.name}")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        raise

if __name__ == "__main__":
    init_db()
