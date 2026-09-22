import os
import time
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()  
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

# Load sections from step 1
with open('extracted_data/door_sections.json', 'r', encoding='utf-8') as f:
    sections = json.load(f)

# Load parsed ifc schema
with open('parsed_ifc_schema.json', 'r', encoding='utf-8') as f:
    parsed_ifc_schema = json.load(f)

# Load logical rule template
with open('logic_template.json', 'r', encoding='utf-8') as f:
    logic_template= json.load(f)

test_pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pdf-test", "DBSUA.pdf")

# Upload file
print("Uploading file...")
building_code_file = client.files.upload(file=test_pdf_path)

print("Processing PDF...")
while building_code_file.state.name == "PROCESSING":
    time.sleep(2)
    building_code_file = client.files.get(name=building_code_file.name)

# Detailed prompt
prompt = (
    "You are a BIM-Compliance Expert parsing the building code rules for an IFC File as logical rules. "
    f"You are auditing an IFC file where you only have access to this schema:{json.dumps(parsed_ifc_schema, ensure_ascii=False)} "
    f"Based on these door sections: {json.dumps(sections, ensure_ascii=False)} "
    ""
    "Extract ALL the door dimension requirements. "
    "Focus on: width, height, clearances for doors. "
    ""
    "MANDATORY RULES: "
    "1. Convert ALL dimensions to millimeters (mm). "
    "2. Map to IFC properties: width, height. "
    "3. Use standard operators: '>=', '<=', '=='. "
    ""
    f"Return only JSON array: following this logic template:{json.dumps(logic_template, ensure_ascii=False)} "
    ""
    "Do not include markdown code blocks or any extra text."
    "JSON must be in english."
    "Return as JSON array."
)

print("Extracting rules...")
response = client.models.generate_content(
    model="gemini-flash-latest",
    contents=[building_code_file, prompt],
    config=types.GenerateContentConfig(
        temperature=0
    )
)

# Manual parsing to ensure valid JSON data is captured
raw_text = response.text
rules = json.loads(raw_text)

os.makedirs('extracted_data', exist_ok=True)
with open('extracted_data/door_rules.json', 'w', encoding='utf-8') as f:
    json.dump(rules, f, indent=4, ensure_ascii=False)

#print(parsed_building_code)
print("Rules Extracted:")
print(json.dumps(rules, indent=4))
