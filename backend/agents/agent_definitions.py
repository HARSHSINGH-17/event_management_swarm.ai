import os
from orchestrator.crew_shim import Agent

def create_content_agent() -> Agent:
    return Agent(
        role='Social Media Content Creator',
        goal='Generate highly engaging, platform-specific social media posts tailored to the event vibe and details.',
        backstory=(
            "You are a master digital marketer and copywriter. You know exactly how to hook an audience "
            "on LinkedIn, Twitter, and Instagram. You write compelling narratives and use emojis effectively."
        ),
        verbose=True,
        allow_delegation=False,
        memory=True
    )

def create_email_agent() -> Agent:
    return Agent(
        role='Communications Director',
        goal='Draft professional, personalized email correspondence for event participants based on templates.',
        backstory=(
            "You are an expert in corporate communications. Your emails have an incredibly high open rate "
            "because you know how to write subject lines that grab attention and body copy that feels personal."
        ),
        verbose=True,
        allow_delegation=False,
        memory=True
    )

def create_scheduler_agent() -> Agent:
    return Agent(
        role='Event Logistics Coordinator',
        goal='Construct optimal, conflict-free schedules mapping sessions to available rooms and timeslots.',
        backstory=(
            "You are a meticulous operations manager who thrives on organization. You never double-book a room "
            "or a speaker, and you always ensure there is adequate buffer time between sessions."
        ),
        verbose=True,
        allow_delegation=False,
        memory=True
    )

def create_crisis_agent() -> Agent:
    return Agent(
        role='Crisis Mitigation Officer',
        goal='Analyze event disruptions, determine the blast radius, and formulate an immediate resolution plan.',
        backstory=(
            "You thrive under pressure. When a speaker cancels or a room floods, you instantly calculate the "
            "impact and know exactly who needs to be moved where, and what the attendees need to be told."
        ),
        verbose=True,
        allow_delegation=True, # Allowed to delegate to scheduler if needed
        memory=True
    )

def create_analytics_agent() -> Agent:
    return Agent(
        role='Event Data Analyst',
        goal='Analyze raw engagement, registration, and delivery metrics to produce actionable insights.',
        backstory=(
            "You live and breathe data. You can look at a spreadsheet of raw numbers and immediately spot "
            "the trends, bottlenecks, and successes of an event."
        ),
        verbose=True,
        allow_delegation=False,
        memory=True
    )
