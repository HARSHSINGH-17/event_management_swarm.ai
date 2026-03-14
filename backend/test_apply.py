import requests
import json

url = "http://localhost:8000/api/events/apply"

payload = {
    "extracted_data": {
        "event": {"name": "Test Event", "start_date": "2024-05-01"},
        "sessions": [{"id": "s1", "title": "Opening Keynote"}],
        "rooms": [{"id": "r1", "name": "Main Hall"}],
        "speakers": [{"id": "sp1", "name": "John Doe", "email": "johndoe@example.com"}],
        "crises": []
    },
    "answers": {},
    "questions": []
}

try:
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
except requests.exceptions.ConnectionError:
    print("Backend server is not running, skipping live API test.")
