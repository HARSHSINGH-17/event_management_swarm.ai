import os
import json
from groq import Groq
from pydantic import BaseModel

class Agent:
    def __init__(self, role, goal, backstory, verbose=False, allow_delegation=False, memory=True):
        self.role = role
        self.goal = goal
        self.backstory = backstory
        self.verbose = verbose
        self.allow_delegation = allow_delegation
        self.memory = memory
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    def execute(self, task_description: str, expected_output: str, output_schema: type[BaseModel] = None):
        """Executes the task using the Groq API and strictly enforces JSON structure."""
        if self.verbose:
            print(f"[AGENT: {self.role}] Executing Task...")

        schema_hint = ""
        if output_schema:
            schema_hint = f"\nYou MUST respond with ONLY valid JSON strictly matching this schema:\n{json.dumps(output_schema.model_json_schema(), indent=2)}"
        
        system_prompt = f"Role: {self.role}\nGoal: {self.goal}\nBackstory: {self.backstory}\n{schema_hint}"
        
        response = self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Task: {task_description}\nExpected Output: {expected_output}"}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if self.verbose:
            print(f"[AGENT: {self.role}] Task Complete.")
            
        return _extract_json(content)

def _extract_json(raw_text: str) -> dict:
    try:
        start = raw_text.find('{')
        end = raw_text.rfind('}') + 1
        return json.loads(raw_text[start:end])
    except Exception:
        return {}

class Task:
    def __init__(self, description, expected_output, agent, output_json=None):
        self.description = description
        self.expected_output = expected_output
        self.agent = agent
        self.output_json = output_json
        
    def run(self):
        return self.agent.execute(self.description, self.expected_output, self.output_json)


class Process:
    sequential = "sequential"


class Crew:
    def __init__(self, agents, tasks, process=Process.sequential, verbose=False):
        self.agents = agents
        self.tasks = tasks
        self.process = process
        self.verbose = verbose

    def kickoff(self) -> dict:
        """Runs the tasks in sequence. For now, we return the output of the final task."""
        if self.verbose:
            print(f"[CREW] Starting Execution with {len(self.agents)} agents and {len(self.tasks)} tasks.")
            
        final_output = {}
        for idx, task in enumerate(self.tasks):
            if self.verbose:
                print(f"[CREW] Task {idx + 1}/{len(self.tasks)}")
            final_output = task.run()
            
        if self.verbose:
            print(f"[CREW] Execution Finished.")
        return final_output
