from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Status = Literal[
    "wishlist",
    "applied",
    "phone_screen",
    "interview",
    "offer",
    "accepted",
    "rejected",
    "withdrawn",
    "ghosted",
]
WorkMode = Literal["remote", "hybrid", "onsite"]
Priority = Literal["low", "medium", "high"]
RoundType = Literal[
    "phone_screen", "technical", "behavioral", "system_design", "onsite", "final", "other"
]
Outcome = Literal["pending", "passed", "failed", "cancelled"]
FileType = Literal["resume", "cover_letter", "other"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Applications -----------------------------------------------------------


class ApplicationBase(BaseModel):
    company: str = Field(min_length=1)
    role: str = Field(min_length=1)
    status: Status = "wishlist"
    applied_date: date | None = None
    job_url: str | None = None
    location: str | None = None
    work_mode: WorkMode | None = None
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    salary_currency: str = "USD"
    source: str | None = None
    priority: Priority = "medium"

    @model_validator(mode="after")
    def salary_range_valid(self):
        if (
            self.salary_min is not None
            and self.salary_max is not None
            and self.salary_min > self.salary_max
        ):
            raise ValueError("salary_min must be <= salary_max")
        return self


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    company: str | None = Field(default=None, min_length=1)
    role: str | None = Field(default=None, min_length=1)
    status: Status | None = None
    applied_date: date | None = None
    job_url: str | None = None
    location: str | None = None
    work_mode: WorkMode | None = None
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    salary_currency: str | None = None
    source: str | None = None
    priority: Priority | None = None
    stale_snoozed_until: date | None = None


class StatusUpdate(BaseModel):
    status: Status


class ApplicationRead(ORMModel):
    id: int
    company: str
    role: str
    status: Status
    applied_date: date | None
    job_url: str | None
    location: str | None
    work_mode: WorkMode | None
    salary_min: int | None
    salary_max: int | None
    salary_currency: str
    source: str | None
    priority: Priority
    stale_snoozed_until: date | None
    created_at: datetime
    updated_at: datetime


class ReminderBrief(ORMModel):
    id: int
    due_date: date
    description: str


class InterviewBrief(ORMModel):
    id: int
    round_type: RoundType
    scheduled_at: datetime | None


class ApplicationCard(ApplicationRead):
    """List-view shape consumed by the kanban board."""

    days_since_applied: int | None = None
    next_reminder: ReminderBrief | None = None
    next_interview: InterviewBrief | None = None


# --- Posting preview (autofill from a pasted URL) ---------------------------


class PostingPreviewRequest(BaseModel):
    url: str = Field(min_length=1)


class PostingPreview(BaseModel):
    """Whatever a job posting page gave up; None means unknown. The feature
    is best-effort by design, so this is always a 200 — an unreachable or
    unreadable page just returns all Nones."""

    company: str | None = None
    role: str | None = None
    location: str | None = None
    work_mode: WorkMode | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str | None = None
    source: str | None = None


# --- Contacts ---------------------------------------------------------------


class ContactCreate(BaseModel):
    name: str = Field(min_length=1)
    role: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedin_url: str | None = None
    notes: str | None = None


class ContactUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    role: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedin_url: str | None = None
    notes: str | None = None


class ContactRead(ORMModel):
    id: int
    application_id: int
    name: str
    role: str | None
    email: str | None
    phone: str | None
    linkedin_url: str | None
    notes: str | None
    created_at: datetime


# --- Interview rounds -------------------------------------------------------


class InterviewCreate(BaseModel):
    round_type: RoundType
    scheduled_at: datetime | None = None
    interviewers: str | None = None
    outcome: Outcome = "pending"
    notes: str | None = None


class InterviewUpdate(BaseModel):
    round_type: RoundType | None = None
    scheduled_at: datetime | None = None
    interviewers: str | None = None
    outcome: Outcome | None = None
    notes: str | None = None


class InterviewRead(ORMModel):
    id: int
    application_id: int
    round_type: RoundType
    scheduled_at: datetime | None
    interviewers: str | None
    outcome: Outcome
    notes: str | None
    created_at: datetime


# --- Notes ------------------------------------------------------------------


class NoteCreate(BaseModel):
    body: str = Field(min_length=1)


class NoteUpdate(BaseModel):
    body: str = Field(min_length=1)


class NoteRead(ORMModel):
    id: int
    application_id: int
    body: str
    created_at: datetime
    updated_at: datetime


# --- Attachments ------------------------------------------------------------


class AttachmentRead(ORMModel):
    id: int
    application_id: int
    filename: str
    file_type: FileType
    content_type: str | None
    size_bytes: int | None
    uploaded_at: datetime


# --- Reminders --------------------------------------------------------------


class ReminderCreate(BaseModel):
    due_date: date
    description: str = Field(min_length=1)
    done: bool = False


class ReminderUpdate(BaseModel):
    due_date: date | None = None
    description: str | None = Field(default=None, min_length=1)
    done: bool | None = None


class ReminderRead(ORMModel):
    id: int
    application_id: int
    due_date: date
    description: str
    done: bool
    created_at: datetime


class ReminderWithApplication(ReminderRead):
    company: str
    role: str


# --- Detail (application + children) ----------------------------------------


class ApplicationDetail(ApplicationRead):
    contacts: list[ContactRead] = []
    interview_rounds: list[InterviewRead] = []
    notes: list[NoteRead] = []
    attachments: list[AttachmentRead] = []
    reminders: list[ReminderRead] = []
