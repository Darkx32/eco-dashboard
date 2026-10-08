run-backend:
	cd backend; \
	uv run fastapi dev app/main.py; \
	wait;