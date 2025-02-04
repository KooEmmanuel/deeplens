from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import chat, documents, conversations
import os
from dotenv import load_dotenv
from database import engine
from models import Base

load_dotenv()

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configure CORS with more specific settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Development
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_URL", "http://localhost:3000")  # Production URL from env
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include routers
app.include_router(chat.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=int(os.getenv("PORT", "8000")),
        reload=True  # Enable auto-reload during development
    ) 