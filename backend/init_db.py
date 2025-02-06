from database import engine, Base
from models import Conversation, Message, Document
import os

def init_db():
    # Get database path from environment variable
    db_path = os.environ.get('DATABASE_URL', '').replace('sqlite:///', '')
    
    # Check if database file exists
    if os.path.exists(db_path):
        print(f"Removing existing database at {db_path}")
        os.remove(db_path)
    
    print("Creating new tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Database initialized successfully!")

if __name__ == "__main__":
    init_db() 