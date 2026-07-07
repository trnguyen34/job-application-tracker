"""Populate tracker.db with realistic sample data.

Usage (from backend/):
    .venv/bin/python seed.py [--force]

Connects to the database directly (not through the API), so the server
doesn't need to be running. Refuses to touch a non-empty database unless
--force is given, in which case all rows are wiped first.
"""

import argparse
import sys
from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import Base, engine
from app.models import Application, Contact, InterviewRound, Note, Reminder

TODAY = date.today()


def days_ago(n: int) -> date:
    return TODAY - timedelta(days=n)


def at(d: date, hour: int) -> datetime:
    return datetime.combine(d, time(hour=hour))


def build_applications() -> list[Application]:
    return [
        Application(
            company="Stripe",
            role="Backend Engineer, Payments",
            status="interview",
            applied_date=days_ago(21),
            job_url="https://stripe.com/jobs/listing/backend-engineer",
            location="San Francisco, CA",
            work_mode="hybrid",
            salary_min=170000,
            salary_max=220000,
            source="LinkedIn",
            priority="high",
            contacts=[
                Contact(
                    name="Maya Chen",
                    role="Technical Recruiter",
                    email="maya.chen@stripe.example",
                    linkedin_url="https://linkedin.com/in/mayachen",
                    notes="Very responsive; prefers email.",
                )
            ],
            interview_rounds=[
                InterviewRound(
                    round_type="phone_screen",
                    scheduled_at=at(days_ago(14), 10),
                    interviewers="Maya Chen",
                    outcome="passed",
                    notes="30 min chat about background; friendly.",
                ),
                InterviewRound(
                    round_type="technical",
                    scheduled_at=at(days_ago(7), 14),
                    interviewers="Diego Ramos",
                    outcome="passed",
                    notes="API design exercise. Went well.",
                ),
                InterviewRound(
                    round_type="onsite",
                    scheduled_at=at(TODAY + timedelta(days=3), 9),
                    interviewers="Panel: Diego Ramos, Sarah Kim, Alex Wu",
                    outcome="pending",
                ),
            ],
            notes=[
                Note(body="Referred internally by Sam after applying — mention in onsite."),
            ],
            reminders=[
                Reminder(
                    due_date=TODAY + timedelta(days=2),
                    description="Prep system design for onsite",
                ),
            ],
        ),
        Application(
            company="Figma",
            role="Full Stack Engineer",
            status="phone_screen",
            applied_date=days_ago(10),
            job_url="https://figma.com/careers/full-stack",
            location="New York, NY",
            work_mode="remote",
            salary_min=160000,
            salary_max=200000,
            source="Referral",
            priority="high",
            contacts=[
                Contact(
                    name="Jordan Lee",
                    role="Engineering Manager",
                    email="jordan@figma.example",
                    notes="College friend of Priya; made the referral.",
                )
            ],
            interview_rounds=[
                InterviewRound(
                    round_type="phone_screen",
                    scheduled_at=at(TODAY + timedelta(days=1), 11),
                    interviewers="Jordan Lee",
                    outcome="pending",
                ),
            ],
            reminders=[
                Reminder(
                    due_date=TODAY,
                    description="Review Figma plugin API before screen",
                ),
            ],
        ),
        Application(
            company="Datadog",
            role="Software Engineer, Observability",
            status="applied",
            applied_date=days_ago(5),
            job_url="https://careers.datadoghq.com/detail/observability",
            location="Boston, MA",
            work_mode="hybrid",
            salary_min=150000,
            salary_max=185000,
            source="Company website",
            priority="medium",
            reminders=[
                Reminder(
                    due_date=TODAY + timedelta(days=5),
                    description="Follow up if no response",
                ),
            ],
        ),
        Application(
            company="Anthropic",
            role="Member of Technical Staff",
            status="applied",
            applied_date=days_ago(3),
            job_url="https://anthropic.com/careers/mts",
            location="San Francisco, CA",
            work_mode="onsite",
            salary_min=200000,
            salary_max=280000,
            source="LinkedIn",
            priority="high",
            notes=[Note(body="Tailored resume to emphasize distributed systems work.")],
        ),
        Application(
            company="Linear",
            role="Product Engineer",
            status="wishlist",
            job_url="https://linear.app/careers/product-engineer",
            location="Remote (US)",
            work_mode="remote",
            source="Twitter/X",
            priority="medium",
            notes=[Note(body="Waiting for a senior opening; team is small.")],
        ),
        Application(
            company="Vercel",
            role="Frontend Engineer",
            status="wishlist",
            location="Remote (US)",
            work_mode="remote",
            source="Hacker News",
            priority="low",
        ),
        Application(
            company="Airbnb",
            role="Senior Software Engineer",
            status="offer",
            applied_date=days_ago(45),
            location="San Francisco, CA",
            work_mode="hybrid",
            salary_min=185000,
            salary_max=230000,
            source="Recruiter outreach",
            priority="high",
            contacts=[
                Contact(
                    name="Tom Baker",
                    role="Senior Recruiter",
                    email="tom.baker@airbnb.example",
                    phone="+1 415 555 0132",
                )
            ],
            interview_rounds=[
                InterviewRound(
                    round_type="phone_screen",
                    scheduled_at=at(days_ago(38), 13),
                    outcome="passed",
                ),
                InterviewRound(
                    round_type="technical",
                    scheduled_at=at(days_ago(30), 15),
                    outcome="passed",
                ),
                InterviewRound(
                    round_type="onsite",
                    scheduled_at=at(days_ago(20), 9),
                    interviewers="Full loop, 4 sessions",
                    outcome="passed",
                ),
            ],
            notes=[
                Note(body="Offer: 195k base + RSUs. Deadline to respond is next Friday."),
            ],
            reminders=[
                Reminder(
                    due_date=TODAY + timedelta(days=4),
                    description="Respond to Airbnb offer",
                ),
            ],
        ),
        Application(
            company="Netflix",
            role="Senior Platform Engineer",
            status="rejected",
            applied_date=days_ago(60),
            location="Los Gatos, CA",
            work_mode="onsite",
            source="LinkedIn",
            priority="medium",
            interview_rounds=[
                InterviewRound(
                    round_type="phone_screen",
                    scheduled_at=at(days_ago(50), 16),
                    outcome="failed",
                    notes="Didn't click with the interviewer; heavy on JVM internals.",
                ),
            ],
            notes=[Note(body="Rejection email 3 days after the screen. Onward.")],
        ),
        Application(
            company="Shopify",
            role="Staff Developer",
            status="ghosted",
            applied_date=days_ago(75),
            location="Remote (Americas)",
            work_mode="remote",
            source="Company website",
            priority="low",
            reminders=[
                Reminder(
                    due_date=days_ago(40),
                    description="Ping recruiter one last time",
                    done=True,
                ),
            ],
        ),
        Application(
            company="Notion",
            role="Software Engineer, Backend",
            status="withdrawn",
            applied_date=days_ago(30),
            location="San Francisco, CA",
            work_mode="hybrid",
            salary_min=155000,
            salary_max=190000,
            source="Referral",
            priority="low",
            notes=[
                Note(body="Withdrew after Airbnb offer — comp band was lower."),
            ],
        ),
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--force", action="store_true", help="wipe existing data before seeding"
    )
    args = parser.parse_args()

    Base.metadata.create_all(engine)
    with Session(engine) as session:
        existing = session.scalar(select(func.count()).select_from(Application))
        if existing:
            if not args.force:
                print(
                    f"Database already has {existing} applications; "
                    "re-run with --force to wipe and reseed."
                )
                return 1
            for table in reversed(Base.metadata.sorted_tables):
                session.execute(table.delete())

        applications = build_applications()
        session.add_all(applications)
        session.commit()
        print(f"Seeded {len(applications)} applications.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
