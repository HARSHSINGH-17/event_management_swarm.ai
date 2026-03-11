"""
Pydantic schemas — request/response shapes for all auth endpoints.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


# ── Request bodies ────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    organization: Optional[str] = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Response bodies ───────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    email: str
    fullName: str        # camelCase to match what the frontend expects
    organization: str
    role: str
    createdAt: str       # ISO string

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_user(cls, user) -> "UserOut":
        return cls(
            id=user.id,
            email=user.email,
            fullName=user.full_name or "",
            organization=user.organization or "",
            role=user.role,
            createdAt=user.created_at.isoformat() if user.created_at else "",
        )


class AuthResponse(BaseModel):
    user: UserOut
    token: str
    refreshToken: str


class TokenResponse(BaseModel):
    token: str
