from database import engine, Base
from models import Conversation, Message  # Import your models

def init_db():
    print("Creating database tables...")
    Base.metadata.drop_all(bind=engine)  # Drop existing tables
    Base.metadata.create_all(bind=engine)  # Create new tables
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_db() 