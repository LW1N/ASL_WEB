# Use the official Python image from the Docker Hub as a base image
FROM python:3.12-slim
# Install uv from the Astral SH GitHub Container Registry
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/

# Copy the project into the image
ADD . /app

# Sync the project into a new environment, asserting the lockfile is up to date
WORKDIR /app

# Install dependencies from pyproject.toml and lockfile
RUN uv sync --locked

# Expose the port the app runs on
EXPOSE 8000

# Presuming there is a `my_app` command provided by the project
CMD ["uv", "run", "main.py"]