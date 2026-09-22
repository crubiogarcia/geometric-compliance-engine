# backend/helpers.py

def filter_simple_rules(rules):
    """
    Filter out complex rules, keep only simple numeric rules
    
    Args:
        rules: List of rule dictionaries
        
    Returns:
        List of simple rules only
    """
    complex_keywords = [
        'building', 'edificio',
        'accessible', 'accesible',
        'elevator', 'ascensor',
        'parking', 'aparcamiento',
        'fire', 'fuego',
        'stair', 'escalera',
        'ramp', 'rampa'
    ]
    
    simple_rules = []
    
    for rule in rules:
        context_lower = rule['context'].lower()
        requirement_lower = rule.get('requirement', '').lower()
        
        is_complex = any(
            keyword in context_lower or keyword in requirement_lower
            for keyword in complex_keywords
        )
        
        has_value = rule['value'] is not None
        
        if not is_complex and has_value:
            simple_rules.append(rule)
    
    return simple_rules


def get_checkable_rules(rules):
    """Get rules we can actually check with IFC data"""
    checkable_params = ['width', 'height', 'clear width', 'anchura', 'altura']
    
    checkable = []
    for rule in rules:
        param_lower = rule['parameter'].lower()
        if any(p in param_lower for p in checkable_params):
            checkable.append(rule)
    
    return checkable