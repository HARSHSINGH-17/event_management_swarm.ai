import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from groq import Groq

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def email_agent(state: dict) -> dict:
    """
    Sends personalized bulk emails from email_queue.
    Auto-triggered by Scheduler or Crisis agents.

    Input state keys read:  email_queue, event_context, participants
    Output state keys set:  email_queue (cleared), workflow_complete, agent_logs
    """
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [Email Agent] Processing email queue...")

    email_queue = state.get("email_queue", [])
    if not email_queue:
        return {
            "workflow_complete": True,
            "agent_logs": [f"[{ts}] Email Agent: No emails in queue. Done."]
        }

    EMAIL_USER = os.getenv("EMAIL_USER")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
    event_name = state.get("event_context", {}).get("name", "the event")

    sent_count = 0
    failed_count = 0
    all_logs = []

    if not EMAIL_USER or not EMAIL_PASSWORD:
        all_logs.append(f"[{ts}] Email Agent: SMTP credentials not set — skipping send (dry-run mode)")
        return {
            "email_queue": [],
            "workflow_complete": True,
            "agent_logs": all_logs
        }

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)

        for email_task in email_queue:
            recipients = email_task.get("recipients", [])
            template = email_task.get("template", "default")
            task_type = email_task.get("type", "notification")

            for recipient in recipients:
                try:
                    subject, body = _generate_email(recipient, template, task_type, event_name, state)
                    msg = MIMEMultipart()
                    msg["From"] = EMAIL_USER
                    msg["To"] = recipient.get("email", "")
                    msg["Subject"] = subject
                    msg.attach(MIMEText(body, "plain"))
                    server.send_message(msg)
                    sent_count += 1
                except Exception as e:
                    failed_count += 1
                    all_logs.append(f"[{ts}] Email Agent FAILED for {recipient.get('email')}: {e}")

        server.quit()
    except Exception as e:
        all_logs.append(f"[{ts}] Email Agent SMTP critical failure: {e}")

    all_logs.insert(0, f"[{ts}] Email Agent: Sent={sent_count}, Failed={failed_count}")
    return {
        "email_queue": [],          # Always clear the queue
        "workflow_complete": True,
        "agent_logs": all_logs,
    }


def _generate_email(recipient: dict, template: str, task_type: str, event_name: str, state: dict):
    """Generates a personalized subject + body using Groq."""
    name = recipient.get("name", "Participant")

    if template == "schedule_change":
        subject = f"[{event_name}] Your Schedule Has Been Updated"
        body = (
            f"Dear {name},\n\n"
            f"We have an important update regarding {event_name}. Your session schedule has been updated "
            f"due to optimization by our AI scheduling system.\n\n"
            f"Please check the event platform for the latest schedule.\n\n"
            f"Best regards,\nEvent Management Team"
        )
    elif template == "crisis_update":
        subject = f"[URGENT] {event_name} — Important Schedule Change"
        body = (
            f"Dear {name},\n\n"
            f"An unexpected situation has occurred at {event_name} that requires a schedule adjustment.\n\n"
            f"Our team is working to minimize disruption. Please check the event platform for the updated schedule.\n\n"
            f"We apologize for the inconvenience.\n\nBest regards,\nEvent Management Team"
        )
    else:
        subject = f"Important Update: {event_name}"
        body = f"Dear {name},\n\nThank you for registering for {event_name}. We will keep you updated.\n\nBest regards,\nEvent Management Team"

    return subject, body
