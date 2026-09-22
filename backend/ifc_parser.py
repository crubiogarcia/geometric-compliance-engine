# backend/ifc_parser.py
"""
Helper functions for parsing IFC files
"""
import ifcopenshell
import os
import json

def extract_doors(ifc_file):
    """Extract all door data from IFC file"""
    doors = []
    
    for door in ifc_file.by_type("IfcDoor"):
        doors.append({
            'id': door.id(),
            'global_id': door.GlobalId,
            'name': door.Name or "Unnamed Door",
            'tag': door.Tag if hasattr(door, 'Tag') else None,
            'type': door.ObjectType if hasattr(door, 'ObjectType') else None,
            'width': door.OverallWidth if hasattr(door, 'OverallWidth') else None,
            'height': door.OverallHeight if hasattr(door, 'OverallHeight') else None,
            'is_external': get_is_external(door),
            'location': get_location(door)
        })
    
    return doors

def get_is_external(door):
    """Check if door is external/exterior"""
    for definition in door.IsDefinedBy:
        if definition.is_a('IfcRelDefinesByProperties'):
            property_set = definition.RelatingPropertyDefinition
            if hasattr(property_set, 'Name') and property_set.Name == 'Pset_DoorCommon':
                if hasattr(property_set, 'HasProperties'):
                    for prop in property_set.HasProperties:
                        if prop.Name == 'IsExternal':
                            return prop.NominalValue.wrappedValue if hasattr(prop, 'NominalValue') else None
    return None

def get_location(door):
    """Get door location (floor/level)"""
    try:
        if hasattr(door, 'ContainedInStructure'):
            for rel in door.ContainedInStructure:
                if hasattr(rel, 'RelatingStructure'):
                    return rel.RelatingStructure.Name or "Unknown"
    except:
        pass
    return None

if __name__ == "__main__":
    testfile = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sample_files_ifc", "2022020320211122Wellness center Sama.ifc")
    ifc = ifcopenshell.open(testfile)
    doors = extract_doors(ifc)

    os.makedirs('extracted_data', exist_ok=True)
    with open('extracted_data/door_data.json', 'w', encoding='utf-8') as f:
        json.dump(doors, f, indent=4, ensure_ascii=False)
    
    print(f"Found {len(doors)} doors")
    print(doors)

