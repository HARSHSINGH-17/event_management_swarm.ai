"""
Auth service — password hashing, JWT creation/validation, user CRUD.
Uses bcrypt directly (avoids passlib's time.clock Python 3.8+ issue).
"""
import os
import uuid
import bcrypt
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from sqlalchemy.orm import Session

from auth.models import User

# ── Config ─────────────────────────────────────────────────────────────────────

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "swarm-ai-super-secret-jwt-key-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60        # 1 hour
REFRESH_TOKEN_EXPIRE_DAYS = 7

# ── Demo account (auto-seeded on startup) ───────────────────────────────────────

DEMO_EMAIL = "demo@eventswarm.ai"
DEMO_PASSWORD = "demo123"
DEMO_NAME = "Demo User"


# ── Helpers (bcrypt directly) ───────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _create_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + expires_delta
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(user_id: str, email: str) -> str:
    return _create_token(
        {"sub": user_id, "email": email, "type": "access"},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: str) -> str:
    return _create_token(
        {"sub": user_id, "type": "refresh"},
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> Optional[dict]:
    """Returns payload dict or None if invalid/expired."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ── Database operations ─────────────────────────────────────────────────────────

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email.lower()).first()


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def create_user(
    db: Session,
    email: str,
    password: str,
    full_name: str,
    organization: str = "",
    role: str = "organizer",
) -> User:
    user = User(
        id=str(uuid.uuid4()),
        email=email.lower(),
        password_hash=hash_password(password),
        full_name=full_name,
        organization=organization,
        role=role,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


# ── Demo seed ───────────────────────────────────────────────────────────────────

def seed_demo_user(db: Session) -> None:
    """Called at startup — creates demo account if it doesn't exist."""
    existing = get_user_by_email(db, DEMO_EMAIL)
    if not existing:
        create_user(
            db,
            email=DEMO_EMAIL,
            password=DEMO_PASSWORD,
            full_name=DEMO_NAME,
            organization="Event Swarm AI",
            role="admin",
        )
        print(f"[Auth] ✅ Demo account seeded: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    else:
        print(f"[Auth] Demo account already exists: {DEMO_EMAIL}")
