# Dockerfile

# Use an official Python runtime as a parent image
# Choose a version compatible with your dependencies (3.10 is often a good choice)
FROM python:3.10-slim-bullseye

# Set environment variables to prevent Python from writing pyc files to disc
ENV PYTHONDONTWRITEBYTECODE 1
# Ensure Python output is sent straight to terminal without buffering
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies needed by OpenCV and potentially others
# This list might need adjustment based on specific errors during build
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    # Add any other dependencies identified during build errors
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# Copy only requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Make port 5000 available to the world outside this container
# Render will automatically map this to 80/443 externally
# Gunicorn will bind to 0.0.0.0:PORT environment variable set by Render
# EXPOSE 5000 # Often not strictly needed as Render uses the PORT env var

# Define the command to run your app using Gunicorn
# Render sets the PORT environment variable, Gunicorn uses it automatically
# Use --timeout to allow longer for potentially slow AI requests
# Adjust --workers based on Render's free tier CPU (start with 1 or 2)
CMD ["gunicorn", "--bind", "0.0.0.0:${PORT}", "--workers", "2", "--timeout", "120", "app:app"]
