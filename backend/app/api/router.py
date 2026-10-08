from fastapi import APIRouter

from app.api.routes import auth, health, meetings, messages, participants, signals, users

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(meetings.router)
api_router.include_router(participants.router)
api_router.include_router(messages.router)
api_router.include_router(signals.router)
