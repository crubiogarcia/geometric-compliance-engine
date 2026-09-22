# import openai

#openai.api_key = os.getenv("OPENAI_API_KEY")

#prompt = f"""
#You are an expert in Building Code. 
#Extract all the main rules and requirements from the following text. 
#Return them as a numbered list, each with a short description.

#Text:
#{text[:4000]} 
#"""

#response = openai.chat.completions.create(
#    model="gpt-4",
#    messages=[{"role": "user", "content": prompt}]
#    messages=[{"role": "user", "content": prompt}]
#)

#rules = response.choices[0].message['content']
#print(rules)

import os
import time
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()  
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

test_pdf_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "pdf-test", "DBSUA.pdf")

print("Uploading file...")
building_code_file = client.files.upload(file=test_pdf_path)

print("Processing PDF...")
while building_code_file.state.name == "PROCESSING":
    time.sleep(2)
    building_code_file = client.files.get(name=building_code_file.name)

prompt = (
    "You are a building code parser agent"
    "Extract all quantitative building requirements from this document. "
    "For every rule, identify the specific building element and the constraint. "
    "Return only a JSON list using this exact structure for every object: "
    "["
    "  {"
    "    'element': 'string (e.g., door, stair, corridor)', "
    "    'parameter': 'string (e.g., width, height, fire_rating)', "
    "    'condition': 'string (e.g., min, max, exact)', "
    "    'value': 'number or string', "
    "    'unit': 'string (e.g., mm, minutes, m2)', "
    "    'context': 'string (e.g., accessible route, residential use)'"
    "  }"
    "] "
    "Do not include markdown code blocks or any extra text."
)

print("Analyzing with Gemini...")
response = client.models.generate_content(
    model="gemini-flash-latest",
    contents=[building_code_file, prompt],
    config=types.GenerateContentConfig(
        temperature=0.1
    )
)

# Manual parsing to ensure valid JSON data is captured
raw_text = response.text
parsed_building_code = json.loads(raw_text)
print(parsed_building_code)
print("Rules Extracted:")
print(json.dumps(parsed_building_code, indent=4))
