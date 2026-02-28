import pandas as pd
import psycopg2
from psycopg2.extras import Json
import sys
import re

# ════════════════════════════════════════════════════════════
# DATABASE CONFIGURATION
# ════════════════════════════════════════════════════════════
DB_CONFIG = {
    'host': 'localhost',
    'database': 'exersearch',
    'user': 'postgres',
    'password': '11111',
    'port': 5432
}

# ════════════════════════════════════════════════════════════
# ENHANCED INGREDIENT DETECTION WITH REALISTIC PORTIONS
# ════════════════════════════════════════════════════════════
INGREDIENT_PATTERNS = {
    # Proteins - MORE ACCURATE PORTIONS
    'chicken breast': {
        'ingredient': 'Chicken Breast',
        'breakfast': 100, 'lunch': 150, 'dinner': 150, 'snack': 80,
        'unit': 'g', 'priority': 10
    },
    'tinolang manok|chicken tinola': {
        'ingredient': 'Chicken Thigh',
        'breakfast': 120, 'lunch': 180, 'dinner': 180, 'snack': 100,
        'unit': 'g', 'priority': 9
    },
    'lechon manok|manok|chicken': {
        'ingredient': 'Chicken Thigh',
        'breakfast': 100, 'lunch': 150, 'dinner': 150, 'snack': 80,
        'unit': 'g', 'priority': 7
    },
    
    # Pork
    'liempo|pork belly': {
        'ingredient': 'Pork Belly (Liempo)',
        'breakfast': 80, 'lunch': 120, 'dinner': 120, 'snack': 60,
        'unit': 'g', 'priority': 10
    },
    'pork chop': {
        'ingredient': 'Pork Chop',
        'breakfast': 100, 'lunch': 150, 'dinner': 150, 'snack': 80,
        'unit': 'g', 'priority': 9
    },
    'pork|baboy': {
        'ingredient': 'Ground Pork',
        'breakfast': 80, 'lunch': 120, 'dinner': 120, 'snack': 60,
        'unit': 'g', 'priority': 6
    },
    
    # Beef
    'beef tapa|tapa': {
        'ingredient': 'Beef Chuck',
        'breakfast': 100, 'lunch': 140, 'dinner': 140, 'snack': 80,
        'unit': 'g', 'priority': 10
    },
    'beef|baka': {
        'ingredient': 'Beef Chuck',
        'breakfast': 100, 'lunch': 150, 'dinner': 150, 'snack': 80,
        'unit': 'g', 'priority': 7
    },
    
    # Fish - MORE SPECIFIC
    'bangus belly': {
        'ingredient': 'Milkfish (Bangus)',
        'breakfast': 120, 'lunch': 180, 'dinner': 180, 'snack': 100,
        'unit': 'g', 'priority': 10
    },
    'bangus|milkfish': {
        'ingredient': 'Milkfish (Bangus)',
        'breakfast': 100, 'lunch': 150, 'dinner': 150, 'snack': 80,
        'unit': 'g', 'priority': 9
    },
    'tinapa': {
        'ingredient': 'Milkfish (Bangus)',
        'breakfast': 80, 'lunch': 100, 'dinner': 100, 'snack': 60,
        'unit': 'g', 'priority': 10
    },
    'tilapia': {
        'ingredient': 'Tilapia',
        'breakfast': 120, 'lunch': 180, 'dinner': 180, 'snack': 100,
        'unit': 'g', 'priority': 10
    },
    'tuna belly': {
        'ingredient': 'Tuna',
        'breakfast': 120, 'lunch': 180, 'dinner': 180, 'snack': 100,
        'unit': 'g', 'priority': 10
    },
    'canned tuna|tuna': {
        'ingredient': 'Tuna',
        'breakfast': 80, 'lunch': 120, 'dinner': 120, 'snack': 80,
        'unit': 'g', 'priority': 8
    },
    'salmon': {
        'ingredient': 'Salmon',
        'breakfast': 100, 'lunch': 150, 'dinner': 150, 'snack': 80,
        'unit': 'g', 'priority': 10
    },
    'tanigue': {
        'ingredient': 'Tanigue (Spanish Mackerel)',
        'breakfast': 100, 'lunch': 150, 'dinner': 150, 'snack': 80,
        'unit': 'g', 'priority': 10
    },
    'lapu-lapu': {
        'ingredient': 'Lapu-Lapu (Grouper)',
        'breakfast': 120, 'lunch': 180, 'dinner': 180, 'snack': 100,
        'unit': 'g', 'priority': 10
    },
    
    # Seafood
    'hipon|shrimp': {
        'ingredient': 'Shrimp',
        'breakfast': 80, 'lunch': 120, 'dinner': 120, 'snack': 60,
        'unit': 'g', 'priority': 9
    },
    'squid|pusit': {
        'ingredient': 'Squid',
        'breakfast': 80, 'lunch': 120, 'dinner': 120, 'snack': 60,
        'unit': 'g', 'priority': 9
    },
    'clams|tahong|talaba': {
        'ingredient': 'Mussels (Tahong)',
        'breakfast': 60, 'lunch': 100, 'dinner': 100, 'snack': 50,
        'unit': 'g', 'priority': 9
    },
    'crab|alimasag': {
        'ingredient': 'Crab',
        'breakfast': 80, 'lunch': 120, 'dinner': 120, 'snack': 60,
        'unit': 'g', 'priority': 9
    },
    
    # Eggs - ACCURATE COUNTS
    'egg white': {
        'ingredient': 'Egg White',
        'breakfast': 99, 'lunch': 66, 'dinner': 66, 'snack': 33,  # 3, 2, 2, 1 whites
        'unit': 'pieces', 'priority': 10
    },
    '3 boiled egg|3 egg': {
        'ingredient': 'Egg (Whole)',
        'breakfast': 150, 'lunch': 150, 'dinner': 150, 'snack': 100,  # 3 eggs
        'unit': 'pieces', 'priority': 11
    },
    '2 boiled egg|2 egg': {
        'ingredient': 'Egg (Whole)',
        'breakfast': 100, 'lunch': 100, 'dinner': 100, 'snack': 100,  # 2 eggs
        'unit': 'pieces', 'priority': 11
    },
    'itlog|egg': {
        'ingredient': 'Egg (Whole)',
        'breakfast': 100, 'lunch': 50, 'dinner': 50, 'snack': 50,  # 2, 1, 1, 1 eggs
        'unit': 'pieces', 'priority': 8
    },
    'itlog na maalat|salted egg': {
        'ingredient': 'Salted Egg',
        'breakfast': 50, 'lunch': 50, 'dinner': 50, 'snack': 25,  # Half or whole
        'unit': 'piece', 'priority': 10
    },
    
    # Tofu
    'tofu|tokwa': {
        'ingredient': 'Tofu',
        'breakfast': 80, 'lunch': 120, 'dinner': 120, 'snack': 60,
        'unit': 'g', 'priority': 9
    },
    
    # Rice - MEAL-SPECIFIC PORTIONS
    'sinangag|fried rice': {
        'ingredient': 'Sinangag (Garlic Rice)',
        'breakfast': 150, 'lunch': 200, 'dinner': 200, 'snack': 100,
        'unit': 'g', 'priority': 10
    },
    'brown rice': {
        'ingredient': 'Brown Rice (Cooked)',
        'breakfast': 150, 'lunch': 200, 'dinner': 200, 'snack': 100,
        'unit': 'g', 'priority': 9
    },
    'lugaw|arroz caldo|goto': {
        'ingredient': 'White Rice (Cooked)',
        'breakfast': 200, 'lunch': 250, 'dinner': 250, 'snack': 150,
        'unit': 'g', 'priority': 11
    },
    'champorado': {
        'ingredient': 'White Rice (Cooked)',
        'breakfast': 150, 'lunch': 150, 'dinner': 150, 'snack': 100,
        'unit': 'g', 'priority': 11
    },
    'rice|kanin': {
        'ingredient': 'White Rice (Cooked)',
        'breakfast': 150, 'lunch': 200, 'dinner': 200, 'snack': 100,
        'unit': 'g', 'priority': 6
    },
    
    # Bread
    'pandesal': {
        'ingredient': 'Pandesal',
        'breakfast': 80, 'lunch': 40, 'dinner': 40, 'snack': 40,  # 2, 1, 1, 1 pieces
        'unit': 'pieces', 'priority': 10
    },
    
    # Grains
    'oatmeal': {
        'ingredient': 'Oatmeal',
        'breakfast': 50, 'lunch': 40, 'dinner': 40, 'snack': 30,
        'unit': 'g', 'priority': 10
    },
    
    # Vegetables - REALISTIC PORTIONS
    'kangkong': {
        'ingredient': 'Kangkong (Water Spinach)',
        'breakfast': 50, 'lunch': 80, 'dinner': 80, 'snack': 40,
        'unit': 'g', 'priority': 9
    },
    'pechay': {
        'ingredient': 'Pechay (Bok Choy)',
        'breakfast': 50, 'lunch': 80, 'dinner': 80, 'snack': 40,
        'unit': 'g', 'priority': 9
    },
    'sitaw': {
        'ingredient': 'Sitaw (String Beans)',
        'breakfast': 50, 'lunch': 80, 'dinner': 80, 'snack': 40,
        'unit': 'g', 'priority': 9
    },
    'ampalaya': {
        'ingredient': 'Ampalaya (Bitter Gourd)',
        'breakfast': 60, 'lunch': 80, 'dinner': 80, 'snack': 40,
        'unit': 'g', 'priority': 9
    },
    'talong|eggplant': {
        'ingredient': 'Talong (Eggplant)',
        'breakfast': 80, 'lunch': 100, 'dinner': 100, 'snack': 60,
        'unit': 'g', 'priority': 9
    },
    'kalabasa|squash': {
        'ingredient': 'Kalabasa (Squash)',
        'breakfast': 60, 'lunch': 100, 'dinner': 100, 'snack': 50,
        'unit': 'g', 'priority': 9
    },
    'sayote': {
        'ingredient': 'Sayote (Chayote)',
        'breakfast': 60, 'lunch': 100, 'dinner': 100, 'snack': 50,
        'unit': 'g', 'priority': 9
    },
    'monggo|mungbean': {
        'ingredient': 'Mung Beans',
        'breakfast': 80, 'lunch': 120, 'dinner': 120, 'snack': 60,
        'unit': 'g', 'priority': 10
    },
    'ensalada|salad|lettuce': {
        'ingredient': 'Lettuce',
        'breakfast': 30, 'lunch': 50, 'dinner': 50, 'snack': 30,
        'unit': 'g', 'priority': 8
    },
    'malunggay': {
        'ingredient': 'Malunggay (Moringa)',
        'breakfast': 20, 'lunch': 30, 'dinner': 30, 'snack': 15,
        'unit': 'g', 'priority': 9
    },
    
    # Root Crops
    'kamote|sweet potato': {
        'ingredient': 'Kamote (Sweet Potato)',
        'breakfast': 150, 'lunch': 120, 'dinner': 120, 'snack': 100,
        'unit': 'g', 'priority': 10
    },
    'potato|patatas': {
        'ingredient': 'Potato',
        'breakfast': 120, 'lunch': 150, 'dinner': 150, 'snack': 80,
        'unit': 'g', 'priority': 9
    },
    'gabi|taro': {
        'ingredient': 'Gabi (Taro)',
        'breakfast': 100, 'lunch': 120, 'dinner': 120, 'snack': 80,
        'unit': 'g', 'priority': 9
    },
    
    # Fruits
    'saba banana|saba': {
        'ingredient': 'Saba Banana',
        'breakfast': 120, 'lunch': 120, 'dinner': 120, 'snack': 120,  # 1 piece
        'unit': 'piece', 'priority': 10
    },
    'banana': {
        'ingredient': 'Saba Banana',
        'breakfast': 120, 'lunch': 120, 'dinner': 120, 'snack': 120,
        'unit': 'piece', 'priority': 8
    },
    
    # Condiments - SMALL AMOUNTS
    'cooking oil|oil': {
        'ingredient': 'Cooking Oil',
        'breakfast': 10, 'lunch': 15, 'dinner': 15, 'snack': 5,
        'unit': 'ml', 'priority': 7
    },
}

# ════════════════════════════════════════════════════════════
# CSV HELPERS
# ════════════════════════════════════════════════════════════
def safe_float(row, *cols, default=0.0):
    for col in cols:
        if col in row.index and pd.notna(row[col]):
            try:
                return float(row[col])
            except (ValueError, TypeError):
                continue
    return default

def safe_str(row, *cols, default=''):
    for col in cols:
        if col in row.index and pd.notna(row[col]):
            val = str(row[col]).strip()
            if val.lower() not in ('nan', ''):
                return val
    return default

# ════════════════════════════════════════════════════════════
# ENHANCED DETECTION
# ════════════════════════════════════════════════════════════
def detect_ingredients(meal_name, meal_type):
    """
    Detect ingredients with MEAL-SPECIFIC portions and priority matching.
    Higher priority patterns are checked first.
    """
    meal_lower = meal_name.lower()
    meal_type = meal_type.lower()
    
    detected = []
    used_ingredients = set()
    
    # Sort by priority (higher first)
    sorted_patterns = sorted(
        INGREDIENT_PATTERNS.items(),
        key=lambda x: x[1].get('priority', 0),
        reverse=True
    )
    
    for pattern, data in sorted_patterns:
        if re.search(r'\b' + pattern + r'\b', meal_lower):
            ingredient_name = data['ingredient']
            
            # Skip if we already detected this ingredient
            if ingredient_name in used_ingredients:
                continue
            
            # Get meal-specific portion
            amount = data.get(meal_type, data.get('lunch', 100))
            
            detected.append({
                'ingredient': ingredient_name,
                'amount_g': amount,
                'unit': data['unit'],
            })
            
            used_ingredients.add(ingredient_name)
    
    return detected

# ════════════════════════════════════════════════════════════
# CONNECT
# ════════════════════════════════════════════════════════════
print("=" * 80)
print("🚀 ENHANCED MEAL IMPORTER - ACCURATE PRICING & PORTIONS")
print("=" * 80)

try:
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    cursor = conn.cursor()
    print("✅ Connected to database")
except Exception as e:
    print(f"❌ Connection failed: {e}")
    sys.exit(1)

# Clear existing data
cursor.execute("SELECT COUNT(*) FROM meals")
existing = cursor.fetchone()[0]

if existing > 0:
    print(f"\n⚠️  {existing} meals in database.")
    response = input("Clear and reimport? (yes/no): ")
    if response.lower() == 'yes':
        cursor.execute("TRUNCATE meals, meal_ingredients RESTART IDENTITY CASCADE")
        conn.commit()
        print("✅ Cleared")
    else:
        print("Cancelled")
        cursor.close()
        conn.close()
        sys.exit(0)

# Load CSV
try:
    df = pd.read_csv('meal_list.csv')
    print(f"✅ Loaded {len(df)} meals from CSV\n")
except Exception as e:
    print(f"❌ CSV load failed: {e}")
    cursor.close()
    conn.close()
    sys.exit(1)

# ════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════
def get_ingredient_id(name):
    cursor.execute("SELECT id FROM ingredients WHERE name = %s", (name,))
    r = cursor.fetchone()
    return r[0] if r else None

def calc_nutrition(ingredient_id, grams):
    cursor.execute("""
        SELECT calories_per_100g, protein_per_100g, carbs_per_100g,
               fats_per_100g, average_cost_per_kg
        FROM ingredients WHERE id = %s
    """, (ingredient_id,))
    r = cursor.fetchone()
    if not r:
        return None
    cal, prot, carbs, fats, cost_kg = [float(x) for x in r]
    m = grams / 100.0
    return {
        'calories': round(cal * m, 1),
        'protein':  round(prot * m, 1),
        'carbs':    round(carbs * m, 1),
        'fats':     round(fats * m, 1),
        'cost':     round((cost_kg / 1000.0) * grams, 2),
    }

# ════════════════════════════════════════════════════════════
# IMPORT
# ════════════════════════════════════════════════════════════
print(f"🚀 Importing {len(df)} meals...\n" + "=" * 80)

imported = skipped = total_links = 0
cost_from_ingredients = 0
cost_from_csv = 0

for idx, row in df.iterrows():
    try:
        cursor.execute("SAVEPOINT meal_sp")
        
        name = safe_str(row, 'name', 'meal_name', default=f"Row {idx+2}")
        meal_type = safe_str(row, 'meal_type', 'type', default='lunch').lower()
        diet_tags_str = safe_str(row, 'diet_tags')
        allergens_str = safe_str(row, 'allergens')
        
        diet_tags = [t.strip() for t in diet_tags_str.split(',') if t.strip() and t.lower() != 'nan']
        allergens = [t.strip() for t in allergens_str.split(',') if t.strip() and t.lower() != 'nan']
        
        # Detect ingredients with MEAL-SPECIFIC portions
        detected = detect_ingredients(name, meal_type)
        
        tot_cal = tot_prot = tot_carbs = tot_fats = tot_cost = 0.0
        links = []
        
        for ing in detected:
            iid = get_ingredient_id(ing['ingredient'])
            if iid:
                n = calc_nutrition(iid, ing['amount_g'])
                if n:
                    tot_cal += n['calories']
                    tot_prot += n['protein']
                    tot_carbs += n['carbs']
                    tot_fats += n['fats']
                    tot_cost += n['cost']
                    links.append({
                        'ingredient_id': iid,
                        'amount_grams': ing['amount_g'],
                        'display_amount': str(int(ing['amount_g'])) if ing['amount_g'] >= 1 else str(ing['amount_g']),
                        'display_unit': ing['unit'],
                        **n,
                    })
        
        # Fallback to CSV if no ingredients detected
        if tot_cal > 0:
            calories, protein, carbs, fats = tot_cal, tot_prot, tot_carbs, tot_fats
            # Use CALCULATED cost (more accurate)
            cost = tot_cost
            cost_from_ingredients += 1
        else:
            calories = safe_float(row, 'total_calories', 'calories')
            protein = safe_float(row, 'total_protein', 'protein')
            carbs = safe_float(row, 'total_carbs', 'carbs')
            fats = safe_float(row, 'total_fats', 'fats')
            cost = safe_float(row, 'estimated_cost', 'cost')
            cost_from_csv += 1
        
        # Insert meal
        cursor.execute("""
            INSERT INTO meals (
                name, meal_type, description,
                total_calories, total_protein, total_carbs, total_fats,
                estimated_cost, diet_tags, allergens, is_active
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id
        """, (
            name, meal_type, f"Filipino {meal_type} meal",
            calories, protein, carbs, fats, cost,
            Json(diet_tags) if diet_tags else None,
            Json(allergens) if allergens else None,
            True,
        ))
        meal_id = cursor.fetchone()[0]
        
        # Insert links
        for lnk in links:
            cursor.execute("""
                INSERT INTO meal_ingredients (
                    meal_id, ingredient_id, amount_grams,
                    display_amount, display_unit,
                    calories, protein, carbs, fats, cost
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT ON CONSTRAINT unique_meal_ingredient DO NOTHING
            """, (
                meal_id, lnk['ingredient_id'], lnk['amount_grams'],
                lnk['display_amount'], lnk['display_unit'],
                lnk['calories'], lnk['protein'], lnk['carbs'],
                lnk['fats'], lnk['cost'],
            ))
            total_links += 1
        
        cursor.execute("RELEASE SAVEPOINT meal_sp")
        imported += 1
        
        if imported % 50 == 0:
            conn.commit()
            print(f"   ✅ {imported}/{len(df)} meals ({total_links} links)...")
    
    except Exception as e:
        cursor.execute("ROLLBACK TO SAVEPOINT meal_sp")
        cursor.execute("RELEASE SAVEPOINT meal_sp")
        skipped += 1
        print(f"⚠️  Skipped '{name}': {e}")

conn.commit()

# ════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════
print("\n" + "=" * 80)
print("✅ IMPORT COMPLETE!")
print("=" * 80)
print(f"✅ Imported: {imported} meals")
print(f"⚠️  Skipped: {skipped} meals")
print(f"🔗 Links: {total_links} ingredient links")
if imported:
    print(f"📊 Avg: {total_links/imported:.1f} ingredients/meal")
print(f"\n💰 Pricing:")
print(f"   {cost_from_ingredients} meals: Calculated from ingredients")
print(f"   {cost_from_csv} meals: Used CSV estimates")

print("\n" + "=" * 80)
print("VERIFICATION")
print("=" * 80)

cursor.execute("SELECT COUNT(*) FROM meals")
print(f"📊 Meals: {cursor.fetchone()[0]}")

cursor.execute("SELECT meal_type, COUNT(*) FROM meals GROUP BY meal_type ORDER BY meal_type")
print("\n📋 By type:")
for t, c in cursor.fetchall():
    print(f"   {t}: {c}")

cursor.execute("SELECT COUNT(*) FROM meal_ingredients")
print(f"\n🔗 Ingredient links: {cursor.fetchone()[0]}")

cursor.execute("""
    SELECT COUNT(*) FROM meals m
    LEFT JOIN meal_ingredients mi ON m.id = mi.meal_id
    WHERE mi.id IS NULL
""")
print(f"⚠️  No ingredients: {cursor.fetchone()[0]}")
print("=" * 80)

cursor.close()
conn.close()
print("✅ Done!")