# Use multi-stage build for smaller final image
FROM python:3.11-slim as builder

# Set working directory
WORKDIR /app

# Install system dependencies required for building Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Make sure alembic is in your requirements.txt
# alembic>=1.7.7

# Copy application code
COPY . .

# Create directory for ChromaDB persistence
RUN mkdir -p /app/chroma_db

# Create directory for database
RUN mkdir -p /app/data

# Set the database path to the mounted volume
ENV DATABASE_URL=sqlite:///./data/app.db

# Expose the port the app runs on
EXPOSE 8000

# Initialize fresh database on container start
CMD ["sh", "-c", "python init_db.py && uvicorn main:app --host 0.0.0.0 --port 8000"] 