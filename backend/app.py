import tempfile
import os
import json # 👈 Added to load the JSON file
from flask import Flask, request, jsonify
from flask_cors import CORS
import ifcopenshell
from ifc_parser import extract_doors


app = Flask(__name__)
CORS(app)

@app.route('/parse-ifc', methods=['POST'])
def parse_ifc():
    file = request.files['ifc']
    
    # Save temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.ifc') as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name
    
    # Parse
    ifc = ifcopenshell.open(tmp_path)
    doors = extract_doors(ifc)
    
    # Clean up
    os.remove(tmp_path)
    
    return jsonify({
        'doors': len(doors),
        'data': doors
    })


@app.route('/api/check-compliance', methods=['POST'])
def check_compliance():
    file = request.files.get('ifc')

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    # Load file contents
    try:
        with open("report/compliance_report.json", "r") as f:
            compliance_report = json.load(f)
    except FileNotFoundError:
        return jsonify({"error": "Report JSON file not found on the server"}), 500

    violations = []
    
    for item in compliance_report:
        if item.get("status") == "FAIL":
            violations.append({
                "door_id": item.get("expressID"),
                "errors": item.get("errors", [])
            })

    return jsonify({
        "violations": violations,
        "total": len(violations)
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)