# ═══════════════════════════════════════════════════════════════
# backend/models/user.py
# User model for authentication and authorization
# ═══════════════════════════════════════════════════════════════

from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum
from datetime import datetime
from core.database import Base
import enum

class UserRole(str, enum.Enum):
    """User role enum - Lawyer or Client."""
    LAWYER = "lawyer"
    CLIENT = "client"


class User(Base):
    """
    User model for authentication.
    Used by both lawyers and clients.
    """
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<User {self.email} ({self.role})>"
