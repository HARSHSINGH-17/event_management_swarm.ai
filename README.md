# 🚀 Event Swarm AI

<div align="center">

![Event Swarm AI](https://img.shields.io/badge/AI-Multi--Agent-blue?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**Autonomous Multi-Agent Event Orchestration Platform**

[Demo](#-demo) • [Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [Documentation](#-documentation)

</div>

---

## 📋 Overview

Event Swarm AI is an intelligent event management system that uses **autonomous AI agents** to handle complex event orchestration tasks. When a crisis occurs (speaker cancellation, room conflict, technical failure), our swarm of specialized agents automatically coordinates to resolve the issue, regenerate schedules, and notify stakeholders—all without human intervention.

### 🎯 Built For
- **Event Organizers** managing complex conferences
- **Crisis Management** requiring instant adaptive responses  
- **Dynamic Scheduling** with real-time constraints
- **Automated Communication** across multiple stakeholders

---

## ✨ Features

### 🤖 Multi-Agent Architecture
- **Crisis Agent** - Analyzes problems and generates resolution strategies
- **Scheduler Agent** - Creates optimized event schedules considering constraints
- **Email Agent** - Drafts and sends stakeholder notifications
- **Autonomous Handoffs** - Agents communicate and coordinate without human input

### 🔐 Authentication & Security
- JWT-based authentication with refresh tokens
- Role-based access control (Admin, Organizer, Viewer)
- Protected API endpoints
- Demo account for instant testing

### 📊 Real-Time Dashboard
- Live agent activity streaming via SSE
- Visual workflow monitoring
- Agent coordination logs
- Schedule visualization

### 🎨 Modern UI/UX
- Responsive React + TypeScript interface
- Tailwind CSS styling
- Real-time updates
- Mobile-friendly design

### 🔄 Crisis Management
- Multiple crisis types supported:
  - Speaker cancellations
  - Room unavailability  
  - Equipment failures
  - Schedule conflicts
- Automatic resolution workflows
- Impact analysis and mitigation

### 📅 Intelligent Scheduling
- Constraint-based optimization
- Room capacity management
- Speaker availability tracking
- Session dependencies
- Time slot optimization

### 📧 Communication Automation
- Automated email generation
- Stakeholder notification
- Template-based messaging
- Dry-run mode for testing

---

## 🏗️ Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     EVENT SWARM AI                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   Crisis    │───▶│  Scheduler  │───▶│    Email    │   │
│  │    Agent    │    │    Agent    │    │    Agent    │   │
│  └─────────────┘    └─────────────┘    └─────────────┘   │
│         │                  │                   │           │
│         └──────────────────┼───────────────────┘           │
│                            ▼                               │
│                   ┌─────────────────┐                      │
│                   │  Shared State   │                      │
│                   │   Management    │                      │
│                   └─────────────────┘                      │
│                            │                               │
├────────────────────────────┼───────────────────────────────┤
│         ORCHESTRATOR       │                               │
│    (Autonomous Routing)    │                               │
├────────────────────────────┼───────────────────────────────┤
│                            │                               │
│    ┌───────────────────────┴────────────────────────┐     │
│    │              FastAPI Backend                   │     │
│    │  • RESTful APIs  • SSE Streaming  • Auth      │     │
│    └────────────────────────────────────────────────┘     │
│                            │                               │
│    ┌───────────────────────┴────────────────────────┐     │
│    │            React Frontend                      │     │
│    │  • TypeScript  • Real-time UI  • Protected    │     │
│    └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Backend**
- **FastAPI** - High-performance async API framework
- **SQLAlchemy** - Database ORM
- **Python-JOSE** - JWT authentication
- **Ollama** - Local LLM integration
- **SQLite** - Lightweight database

**Frontend**
- **React 18** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing

**AI/LLM**
- **Ollama** - Local LLM inference
- **LLaMA 2 / Mistral** - Language models
- **Swarm Pattern** - Multi-agent coordination

---

## 🚀 Quick Start

### Prerequisites
```bash
# Required
- Python 3.10+
- Node.js 18+
- Ollama (for AI agents)

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull LLM model
ollama pull llama2
```

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/yourusername/event-swarm-ai.git
cd event-swarm-ai
```

**2. Backend Setup**
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Run backend
uvicorn main:app --reload --port 8000
```

**3. Frontend Setup**
```bash
cd ../frontend  # or wherever your React app is

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Run frontend
npm run dev
```

**4. Start Ollama**
```bash
ollama serve
```

### 🎮 Demo Account
```
Email: demo@eventswarm.ai
Password: demo123
```

---

## 📖 Documentation

### API Endpoints

#### Authentication
```http
POST /api/auth/login       # User login
POST /api/auth/register    # User registration
GET  /api/auth/me          # Get current user
POST /api/auth/refresh     # Refresh token
```

#### Swarm Orchestration
```http
POST /api/swarm/run        # Execute swarm workflow
GET  /api/swarm/stream     # SSE agent logs
```

### Swarm Workflow Request
```json
{
  "workflow_type": "crisis",
  "sessions": [...],
  "rooms": [...],
  "speakers": [...],
  "crisis": {
    "type": "speaker_cancellation",
    "affected_entity": {
      "id": "sp1",
      "name": "Dr. Smith"
    }
  }
}
```

### Response
```json
{
  "success": true,
  "workflow_type": "crisis",
  "agents_executed": 3,
  "crisis_resolved": true,
  "emails_sent": 0,
  "schedule_updated": true,
  "agent_logs": [...],
  "final_state": {...}
}
```

---

## 🧪 Testing
```bash
# Backend tests
cd backend
python test_orchestrator.py  # Test agent coordination
python test_swarm.py          # Test workflow execution

# Frontend tests
cd frontend
npm test
```

### Test Data
Sample CSV files are provided in `/test-data`:
- `sessions.csv` - Conference sessions
- `rooms.csv` - Venue rooms
- `speakers.csv` - Speaker profiles
- `crisis_scenarios.csv` - Test crisis cases

---

## 🎬 Demo Workflow

1. **Login** with demo account
2. **Upload** test CSV files (sessions, rooms, speakers)
3. **Trigger Crisis** - Simulate speaker cancellation
4. **Watch Agents Work** - Real-time coordination
5. **View Results** - Updated schedule and notifications

### Crisis Resolution Flow
```
Crisis Detected → Crisis Agent Analyzes
                ↓
        Creates Resolution Plan
                ↓
        Scheduler Agent Invoked
                ↓
    Generates New Optimized Schedule
                ↓
        Email Agent Triggered
                ↓
    Drafts Stakeholder Notifications
                ↓
           RESOLVED ✅
```

---

## 🏆 Hackathon Highlights

### ✅ Multi-Agent Orchestration
- 3 autonomous agents with specialized roles
- Seamless handoffs without human intervention
- Shared state management across agents

### ✅ Real-World Use Case
- Solves actual event management pain points
- Production-ready architecture
- Scalable design

### ✅ Technical Innovation
- Swarm AI pattern implementation
- SSE real-time streaming
- Local LLM integration with Ollama

### ✅ User Experience
- Professional authentication system
- Real-time dashboard
- Intuitive crisis management interface

### ✅ Production Ready
- JWT authentication
- Role-based access control
- Comprehensive error handling
- Full TypeScript type safety

---

## 🛠️ Configuration

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:8000
```

---

## 📊 Project Structure
```
event-swarm-ai/
├── backend/
│   ├── main.py                      # FastAPI application
│   ├── swarm/
│   │   ├── orchestrator.py         # Multi-agent orchestrator
│   │   ├── state.py                # Shared state management
│   │   └── agents/
│   │       ├── crisis_agent.py     # Crisis resolution
│   │       ├── scheduler_agent.py  # Schedule optimization
│   │       └── email_agent.py      # Notification generation
│   ├── auth/
│   │   ├── models.py               # User models
│   │   ├── service.py              # Auth logic
│   │   └── dependencies.py         # Auth middleware
│   └── database.py                 # Database setup
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── SwarmControl.tsx
│   │   │   └── CrisisManagement.tsx
│   │   ├── components/
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── UserMenu.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   └── services/
│   │       ├── authService.ts
│   │       └── orchestrator.ts
│   └── package.json
├── test-data/                       # Sample CSV files
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Anthropic** - Claude AI for development assistance
- **Ollama** - Local LLM inference
- **FastAPI** - Amazing Python web framework
- **React** - Powerful UI library
- **Swarm AI Pattern** - Multi-agent coordination inspiration

---

## 📧 Contact

**Project Link:** [https://github.com/yourusername/event-swarm-ai](https://github.com/yourusername/event-swarm-ai)

**Demo:** [Live Demo Link]

**Hackathon Submission:** [Devpost Link]

---

<div align="center">

**⭐ Star this repo if you find it useful! ⭐**

Made with ❤️ for [Hackathon Name]

</div>
```

---

## **GitHub Topics/Tags**

Add these topics to your repository:
```
ai
multi-agent
swarm-ai
event-management
fastapi
react
typescript
llm
ollama
hackathon
crisis-management
scheduling
orchestration
python
typescript
jwt-auth
real-time
sse
automation
