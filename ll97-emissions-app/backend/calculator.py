import os
import json

# Helper to load JSON from file
_DEF_PATH = os.path.dirname(__file__)

def _load_json(filename):
    with open(os.path.join(_DEF_PATH, filename), 'r') as f:
        lines = [line for line in f if not line.strip().startswith('//')]
        return json.loads(''.join(lines))

EMISSIONS_FACTORS = _load_json('emissions_factors.json')
LIMIT_FACTORS = _load_json('limit_factors.json')

# Dynamically get all periods from LIMIT_FACTORS
ALL_PERIODS = set()
for use_type, periods in LIMIT_FACTORS.items():
    ALL_PERIODS.update(periods.keys())
LL97_PERIODS = sorted(list(ALL_PERIODS))
LL97_PENALTY = 268  # $ per tCO2e/yr over limit (example value)

# Map frontend field names to emissions factor keys
FUEL_MAP = {
    'electricity': 'electricity_kwh',
    'gas': 'gas_therms',
    'fuelOil2': 'fuel_oil_2_gallons',
    'fuelOil4': 'fuel_oil_4_gallons',
    'steam': 'steam_mlb'
}

def calculate_emissions_and_limits(building_data: dict, utility_data: dict) -> dict:
    """
    building_data: { 'buildingName': str, 'useTypes': [{useType, area}] }
    utility_data: { ... }
    Returns results for all periods and use types present in limit_factors.json
    """
    # Calculate area by use type
    use_types = building_data.get('useTypes', [])
    area_by_type = {}
    for entry in use_types:
        t = entry.get('useType')
        a = float(entry.get('area', 0) or 0)
        if t and a > 0:
            area_by_type[t] = area_by_type.get(t, 0) + a

    # Results for each period
    periods = []
    for period in LL97_PERIODS:
        # Use period-specific emissions factors
        period_factors = EMISSIONS_FACTORS.get(period, {})
        # Calculate emissions for each fuel for this period
        emissions = {}
        total_emissions = 0.0
        for fuel, factor_key in FUEL_MAP.items():
            usage = float(utility_data.get(fuel, 0) or 0)
            factor = period_factors.get(factor_key, 0)
            emissions[fuel] = usage * factor
            total_emissions += emissions[fuel]
        # Calculate limits for this period
        limits = {}
        for use_type, area in area_by_type.items():
            if use_type in LIMIT_FACTORS and period in LIMIT_FACTORS[use_type]:
                limit_factor = LIMIT_FACTORS[use_type][period]
                limits[use_type] = area * limit_factor
            else:
                limits[use_type] = None
        total_limit = sum([v for v in limits.values() if v is not None])
        if total_limit > 0:
            overage = max(0, total_emissions - total_limit)
            compliance = total_emissions <= total_limit
        else:
            # When the period has a zero limit, any emissions are overage
            overage = total_emissions
            compliance = (total_emissions == 0)
        penalty = overage * LL97_PENALTY if overage and overage > 0 else 0
        periods.append({
            'label': period,
            'limits': limits,
            'totalLimit': total_limit,
            'totalEmissions': total_emissions,
            'overage': overage,
            'penalty': penalty,
            'compliance': compliance,
            'emissionsBelowLimit': max(0, total_limit - total_emissions) if total_limit > 0 else 0,
            'emissionsByFuel': emissions
        })

    return {
        'buildingName': building_data.get('buildingName', ''),
        'areas': area_by_type,
        'utilityUsage': utility_data,
        'periods': periods
    }

# For backward compatibility with app.py

def calculate_emissions(data):
    building_data = {
        'buildingName': data.get('buildingName'),
        'useTypes': data.get('useTypes', [])
    }
    utility_data = {
        'electricity': data.get('electricity'),
        'gas': data.get('gas'),
        'fuelOil2': data.get('fuelOil2'),
        'fuelOil4': data.get('fuelOil4'),
        'steam': data.get('steam')
    }
    return calculate_emissions_and_limits(building_data, utility_data)
