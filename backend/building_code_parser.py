import os
import time
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()  
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

test_pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pdf-test", "DBSUA.pdf")

print("Uploading file...")
building_code_file = client.files.upload(file=test_pdf_path)

print("Processing PDF...")
while building_code_file.state.name == "PROCESSING":
    time.sleep(2)
    building_code_file = client.files.get(name=building_code_file.name)

prompt = (
    "You are a building code analysis agent. "
    "Read this building code document. "
    "Identify and list all sections that contain requirements for: doors. "
    "For each section, provide: "
    "- Section number "
    "- Section title "
    "- Summary of what it covers "
    "Do not include markdown code blocks or any extra text."
    "-Response all in english.  "
    "Return as JSON array."
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

os.makedirs('extracted_data', exist_ok=True)
with open('extracted_data/door_sections.json', 'w', encoding='utf-8') as f:
    json.dump(parsed_building_code, f, indent=4, ensure_ascii=False)

#print(parsed_building_code)
#print("Parsed building code:")
#print(json.dumps(parsed_building_code, indent=4))
