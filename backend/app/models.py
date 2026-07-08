from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

STATUSES = (
    "wishlist",
    "applied",
    "phone_screen",
    "interview",
    "offer",
    "accepted",
    "rejected",
    "withdrawn",
    "ghosted",
)
WORK_MODES = ("remote", "hybrid", "onsite")
PRIORITIES = ("low", "medium", "high")
ROUND_TYPES = (
    "phone_screen",
    "technical",
    "behavioral",
    "system_design",
    "onsite",
    "final",
    "other",
)
OUTCOMES = ("pending", "passed", "failed", "cancelled")
FILE_TYPES = ("resume", "cover_letter", "other")


def _quoted(values: tuple[str, ...]) -> str:
    return ", ".join(f"'{v}'" for v in values)


def local_now() -> datetime:
    """Naive local wall-clock time — the one datetime convention app-wide.
    User-entered scheduled_at arrives as local time from datetime-local
    inputs, and the frontend renders all timestamps as local, so stamped
    fields must match (single user, single machine)."""
    return datetime.now()


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        CheckConstraint(f"status IN ({_quoted(STATUSES)})", name="ck_application_status"),
        CheckConstraint(
            f"work_mode IS NULL OR work_mode IN ({_quoted(WORK_MODES)})",
            name="ck_application_work_mode",
        ),
        CheckConstraint(f"priority IN ({_quoted(PRIORITIES)})", name="ck_application_priority"),
        Index("ix_applications_status", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="wishlist")
    applied_date: Mapped[date | None] = mapped_column(Date)
    job_url: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(Text)
    work_mode: Mapped[str | None] = mapped_column(Text)
    salary_min: Mapped[int | None] = mapped_column(Integer)
    salary_max: Mapped[int | None] = mapped_column(Integer)
    salary_currency: Mapped[str] = mapped_column(Text, nullable=False, default="USD")
    source: Mapped[str | None] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(Text, nullable=False, default="medium")
    # Launch-time stale check: hide this application from the "still in
    # Applied after 3 months" prompt until this date ("Ignore for…").
    stale_snoozed_until: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=local_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=local_now, onupdate=local_now
    )

    contacts: Mapped[list["Contact"]] = relationship(
        back_populates="application", cascade="all, delete-orphan", passive_deletes=True
    )
    interview_rounds: Mapped[list["InterviewRound"]] = relationship(
        back_populates="application", cascade="all, delete-orphan", passive_deletes=True
    )
    notes: Mapped[list["Note"]] = relationship(
        back_populates="application", cascade="all, delete-orphan", passive_deletes=True
    )
    attachments: Mapped[list["Attachment"]] = relationship(
        back_populates="application", cascade="all, delete-orphan", passive_deletes=True
    )
    reminders: Mapped[list["Reminder"]] = relationship(
        back_populates="application", cascade="all, delete-orphan", passive_deletes=True
    )


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(Text)
    linkedin_url: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=local_now)

    application: Mapped[Application] = relationship(back_populates="contacts")


class InterviewRound(Base):
    __tablename__ = "interview_rounds"
    __table_args__ = (
        CheckConstraint(f"round_type IN ({_quoted(ROUND_TYPES)})", name="ck_round_type"),
        CheckConstraint(f"outcome IN ({_quoted(OUTCOMES)})", name="ck_round_outcome"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    round_type: Mapped[str] = mapped_column(Text, nullable=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime)
    interviewers: Mapped[str | None] = mapped_column(Text)
    outcome: Mapped[str] = mapped_column(Text, nullable=False, default="pending")
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=local_now)

    application: Mapped[Application] = relationship(back_populates="interview_rounds")


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=local_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=local_now, onupdate=local_now
    )

    application: Mapped[Application] = relationship(back_populates="notes")


class Attachment(Base):
    __tablename__ = "attachments"
    __table_args__ = (
        CheckConstraint(f"file_type IN ({_quoted(FILE_TYPES)})", name="ck_attachment_file_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    stored_name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    file_type: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str | None] = mapped_column(Text)
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=local_now)

    application: Mapped[Application] = relationship(back_populates="attachments")


class Reminder(Base):
    __tablename__ = "reminders"
    __table_args__ = (Index("ix_reminders_done_due", "done", "due_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=local_now)

    application: Mapped[Application] = relationship(back_populates="reminders")
