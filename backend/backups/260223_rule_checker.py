import json
import os

# Define paths
door_data_path = os.path.join('extracted_data', 'door_data.json')
door_rules_path = os.path.join('extracted_data', 'door_rules.json')

with open(door_data_path, 'r', encoding='utf-8') as f:
    doors = json.load(f)

with open(door_rules_path, 'r', encoding='utf-8') as f:
    rules = json.load(f)

print(f"Loaded {len(doors)} doors and {len(rules)} rules.\n")

for door in doors:
    print(f"--- Analyzing Door: {door['name']} ---")
    
    # Track if we actually checked anything for this door
    checks_performed = 0
    
    for rule in rules:
        prop = rule["property"]
        
        # Check if property exists in door data
        if prop in door:
            actual = door[prop]
            required = rule["value_mm"]
            operator = rule["operator"]
            
            # Logic Check
            passed = False
            if operator == ">=":
                passed = actual >= required
            elif operator == "<=":
                passed = actual <= required
            elif operator == "==":
                passed = actual == required
                
            status = "PASS" if passed else "!!! FAIL !!!"
            print(f"  [{status}] {prop}: {actual}mm {operator} {required}mm (Context: {rule['context']})")
            checks_performed += 1
    
    if checks_performed == 0:
        print("  [SKIP] No matching rules found for this door's properties.")
    print("-" * 40)