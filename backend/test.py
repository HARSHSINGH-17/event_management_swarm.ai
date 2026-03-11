import os
import traceback
from dotenv import load_dotenv
load_dotenv('../.env')
from orchestrator.crew_shim import Agent, Task, Crew
from pydantic import BaseModel

class DemoOutput(BaseModel):
    test: str

agent = Agent(role='test', goal='test', backstory='test', verbose=True)
task = Task(description='test', expected_output='test', agent=agent, output_json=DemoOutput)
crew = Crew(agents=[agent], tasks=[task], verbose=True)
try:
    print(crew.kickoff())
except Exception as e:
    traceback.print_exc()
