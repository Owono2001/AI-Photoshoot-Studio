# Dockerfile

# Use an official Python runtime as a parent image
# Using the full image, not slim, as slim was causing issues
FROM python:3.10-bullseye

# Set environment variables to prevent Python from writing pyc files to disc
ENV PYTHONDONTWRITEBYTECODE 1
# Ensure Python output is sent straight to terminal without buffering
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies needed by OpenCV and potentially others
# (This is the updated section)
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Base libs from before
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    # Common GUI/media libs often needed by OpenCV functions
    libgtk2.0-dev \
    libtbb2 \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libdc1394-dev \
    # Video libs (can sometimes help)
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    libv4l-dev \
    # Cleanup
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# Copy only requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Define the command to run your app using Gunicorn
# Render sets the PORT environment variable, Gunicorn uses it automatically
# Use --timeout to allow longer for potentially slow AI requests
# Adjust --workers based on Render's free tier CPU (start with 1 or 2)
# Using shell form to correctly evaluate $PORT
CMD gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app