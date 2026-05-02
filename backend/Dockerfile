FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

WORKDIR /app

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
