import json
import os

# 1. Load your data
door_data_path = os.path.join('extracted_data', 'door_data.json')
door_rules_path = os.path.join('extracted_data', 'door_rules.json')

with open(door_data_path, 'r', encoding='utf-8') as f:
    doors = json.load(f)
with open(door_rules_path, 'r', encoding='utf-8') as f:
    rules = json.load(f)

# 2. This list will hold our final report for JS
compliance_report = []

for door in doors:
    door_id = door.get("id")
    # Default status is PASS until a rule fails
    door_status = "PASS"
    failed_rules = []

    for rule in rules:
        prop = rule["property"]
        if prop in door and door[prop] is not None:
            actual = door[prop]
            required = rule["value_mm"]
            operator = rule["operator"]

            # Logic Check
            passed = False
            if operator == ">=": passed = actual >= required
            elif operator == "<=": passed = actual <= required
            elif operator == "==": passed = actual == required

            if not passed:
                door_status = "FAIL"
                failed_rules.append({
                    "property": prop,
                    "actual": actual,
                    "required": required,
                    "issue": rule["context"],
                    "code document": rule["code document"],
                    "code section": rule["code section"],
                    "document page": rule["document page"]
                })

    # 3. Add this door's result to our report
    compliance_report.append({
        "expressID": door_id, # Match your JS viewer ID key
        "status": door_status,
        "color": "#2ecc71" if door_status == "PASS" else "#e74c3c", # Green or Red
        "errors": failed_rules
    })

# 4. Save the simple report
with open('report/compliance_report.json', 'w', encoding='utf-8') as f:
    json.dump(compliance_report, f, indent=4)

print(f"Report generated: {len(compliance_report)} elements processed.")