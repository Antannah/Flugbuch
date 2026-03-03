FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend and frontend source
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Ensure data directory exists
RUN mkdir -p /app/backend/data

WORKDIR /app/backend

# The startup command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
