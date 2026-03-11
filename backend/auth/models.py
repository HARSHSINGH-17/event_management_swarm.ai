"""
User model — SQLAlchemy ORM mapping to the `users` table.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False, default="")
    organization = Column(String, nullable=True, default="")
    role = Column(String, nullable=False, default="organizer")  # admin | organizer | viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
