from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    environment_id = Column(
        UUID(as_uuid=True), ForeignKey("environments.id"), nullable=False
    )

    version = Column(String(100), nullable=False)  # e.g. git SHA, tag, build number
    status = Column(
        String(50), nullable=False, default="pending"
    )  # pending|running|succeeded|failed

    logs_url = Column(String(512), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
