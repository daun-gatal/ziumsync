FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

WORKDIR /app

# Install Docker CLI so the Celery worker can communicate with the Docker socket
# (docker-ce-cli only — we do NOT need the full daemon inside the container)
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
        bookworm stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update && apt-get install -y --no-install-recommends \
        docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# Copy the dependency files first for caching
COPY pyproject.toml uv.lock ./

# Install dependencies using uv into the /.venv folder
RUN uv sync --frozen

# Copy the rest of the application
COPY . /app

# Ensure the virtual environment is in the PATH
ENV PATH="/app/.venv/bin:$PATH"

# By default, run the API (this will be overridden for the worker)
CMD ["uvicorn", "ziumsync.main:app", "--host", "0.0.0.0", "--port", "8000"]
