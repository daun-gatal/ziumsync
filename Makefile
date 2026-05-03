.PHONY: run stop logs ps clean help

# Default target
help:
	@echo "ZiumSync Local Development Commands:"
	@echo "  make run    - Start dependencies, run migrations, and start all services (API, Worker, Frontend)"
	@echo "  make stop   - Stop all local services and Docker dependencies"
	@echo "  make logs   - Tail logs for all local services"
	@echo "  make ps     - Show status of local services"
	@echo "  make clean  - Remove log files and PID files"

run:
	@echo "Starting ZiumSync Infrastructure..."
	docker-compose up -d db redis
	@echo "Running Database Migrations..."
	cd backend && uv run alembic upgrade head
	@echo "Starting Backend API..."
	cd backend && uv run uvicorn ziumsync.main:app --reload > ../api.log 2>&1 & echo $$! > .api.pid
	@echo "Starting Celery Worker..."
	cd backend && uv run celery -A ziumsync.worker.celery_app worker --loglevel=info > ../worker.log 2>&1 & echo $$! > .worker.pid
	@echo "Starting Frontend..."
	cd frontend && bun run dev > ../frontend.log 2>&1 & echo $$! > .frontend.pid
	@echo "------------------------------------------------"
	@echo "ZiumSync is now running!"
	@echo "  - Frontend: http://localhost:8080"
	@echo "  - API:      http://localhost:8000"
	@echo "  - Docs:     http://localhost:8000/docs"
	@echo "Use 'make logs' to see output or 'make stop' to shut down."

stop:
	@echo "Stopping ZiumSync Services..."
	@-if [ -f .api.pid ]; then kill $$(cat .api.pid) 2>/dev/null || true; rm .api.pid; fi
	@-if [ -f .worker.pid ]; then kill $$(cat .worker.pid) 2>/dev/null || true; rm .worker.pid; fi
	@-if [ -f .frontend.pid ]; then kill $$(cat .frontend.pid) 2>/dev/null || true; rm .frontend.pid; fi
	@echo "Cleaning up lingering processes on ports..."
	@-lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:8080 | xargs kill -9 2>/dev/null || true
	@-pkill -f "celery -A ziumsync.worker.celery_app" 2>/dev/null || true
	@echo "Stopping Docker Dependencies..."
	docker-compose stop db redis
	@echo "Done."

logs:
	@tail -f api.log worker.log frontend.log

ps:
	@echo "Local Service Status:"
	@if [ -f .api.pid ]; then echo "  API:      Running (PID $$(cat .api.pid))"; else echo "  API:      Stopped"; fi
	@if [ -f .worker.pid ]; then echo "  Worker:   Running (PID $$(cat .worker.pid))"; else echo "  Worker:   Stopped"; fi
	@if [ -f .frontend.pid ]; then echo "  Frontend: Running (PID $$(cat .frontend.pid))"; else echo "  Frontend: Stopped"; fi
	@echo "Docker Dependencies:"
	@docker-compose ps db redis

clean:
	rm -f api.log worker.log frontend.log .api.pid .worker.pid .frontend.pid
