"""
ADVANCED MEAL IMPORTER WITH INGREDIENT BREAKDOWN (FIXED)
=========================================================
Fixes applied:
  1. SAVEPOINT per meal — one failure won't abort the whole transaction
  2. Safe CSV column access with fallbacks for common naming variants
  3. ON CONFLICT DO NOTHING on meal_ingredients to skip duplicate links
  4. Prints actual CSV column names on startup for easy debugging
"""

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
# INGREDIENT DETECTION PATTERNS
# ════════════════════════════════════════════════════════════
INGREDIENT_PATTERNS = {
    'egg white': {'ingredient': 'Egg White', 'amount_g': 33, 'unit': 'piece'},
    'itlog|egg': {'ingredient': 'Egg (Whole)', 'amount_g': 50, 'unit': 'piece'},
    'chicken breast|manok breast': {'ingredient': 'Chicken Breast', 'amount_g': 150, 'unit': 'g'},
    'chicken|manok': {'ingredient': 'Chicken Thigh', 'amount_g': 150, 'unit': 'g'},
    'tinolang manok': {'ingredient': 'Chicken Thigh', 'amount_g': 150, 'unit': 'g'},
    'pork belly|liempo': {'ingredient': 'Pork Belly (Liempo)', 'amount_g': 120, 'unit': 'g'},
    'pork chop': {'ingredient': 'Pork Chop', 'amount_g': 150, 'unit': 'g'},
    'pork|baboy': {'ingredient': 'Ground Pork', 'amount_g': 150, 'unit': 'g'},
    'beef|baka': {'ingredient': 'Beef Chuck', 'amount_g': 150, 'unit': 'g'},
    'bangus|milkfish': {'ingredient': 'Milkfish (Bangus)', 'amount_g': 150, 'unit': 'g'},
    'tinapa': {'ingredient': 'Milkfish (Bangus)', 'amount_g': 100, 'unit': 'g'},
    'tilapia': {'ingredient': 'Tilapia', 'amount_g': 150, 'unit': 'g'},
    'tuna': {'ingredient': 'Tuna', 'amount_g': 120, 'unit': 'g'},
    'hipon|shrimp': {'ingredient': 'Shrimp', 'amount_g': 120, 'unit': 'g'},
    'squid|pusit': {'ingredient': 'Squid', 'amount_g': 120, 'unit': 'g'},
    'tofu|tokwa': {'ingredient': 'Tofu', 'amount_g': 100, 'unit': 'g'},
    'sinangag|fried rice': {'ingredient': 'Sinangag (Garlic Rice)', 'amount_g': 200, 'unit': 'cup'},
    'brown rice': {'ingredient': 'Brown Rice (Cooked)', 'amount_g': 200, 'unit': 'cup'},
    'lugaw|congee|arroz': {'ingredient': 'White Rice (Cooked)', 'amount_g': 150, 'unit': 'cup'},
    'champorado': {'ingredient': 'White Rice (Cooked)', 'amount_g': 150, 'unit': 'cup'},
    'rice|kanin': {'ingredient': 'White Rice (Cooked)', 'amount_g': 200, 'unit': 'cup'},
    'pandesal': {'ingredient': 'Pandesal', 'amount_g': 40, 'unit': 'piece'},
    'oatmeal': {'ingredient': 'Oatmeal', 'amount_g': 50, 'unit': 'cup'},
    'kangkong': {'ingredient': 'Kangkong (Water Spinach)', 'amount_g': 80, 'unit': 'g'},
    'sitaw': {'ingredient': 'Sitaw (String Beans)', 'amount_g': 80, 'unit': 'g'},
    'ampalaya': {'ingredient': 'Ampalaya (Bitter Gourd)', 'amount_g': 80, 'unit': 'g'},
    'talong|eggplant': {'ingredient': 'Talong (Eggplant)', 'amount_g': 100, 'unit': 'g'},
    'kalabasa|squash': {'ingredient': 'Kalabasa (Squash)', 'amount_g': 100, 'unit': 'g'},
    'sayote': {'ingredient': 'Sayote (Chayote)', 'amount_g': 100, 'unit': 'g'},
    'cabbage|repolyo': {'ingredient': 'Cabbage', 'amount_g': 80, 'unit': 'g'},
    'carrot|karot': {'ingredient': 'Carrots', 'amount_g': 60, 'unit': 'g'},
    'tomato|kamatis': {'ingredient': 'Tomato', 'amount_g': 50, 'unit': 'g'},
    'kamote|sweet potato': {'ingredient': 'Kamote (Sweet Potato)', 'amount_g': 150, 'unit': 'g'},
    'potato|patatas': {'ingredient': 'Potato', 'amount_g': 150, 'unit': 'g'},
    'saba': {'ingredient': 'Saba Banana', 'amount_g': 120, 'unit': 'piece'},
    'ensalada|salad': {'ingredient': 'Lettuce', 'amount_g': 50, 'unit': 'g'},
    'oil': {'ingredient': 'Cooking Oil', 'amount_g': 10, 'unit': 'tbsp'},
    'soy sauce|toyo': {'ingredient': 'Soy Sauce', 'amount_g': 15, 'unit': 'tbsp'},
    'vinegar|suka': {'ingredient': 'Vinegar', 'amount_g': 15, 'unit': 'tbsp'},
    'garlic|bawang': {'ingredient': 'Garlic', 'amount_g': 10, 'unit': 'cloves'},
    'onion|sibuyas': {'ingredient': 'Onion (Red)', 'amount_g': 30, 'unit': 'g'},
    'ginger|luya': {'ingredient': 'Ginger', 'amount_g': 10, 'unit': 'g'},
}

# ════════════════════════════════════════════════════════════
# SAFE CSV HELPERS  ← FIX #2
# Tries multiple column name candidates so naming differences
# in your CSV never cause a KeyError crash.
# ════════════════════════════════════════════════════════════
def safe_float(row, *cols, default=0.0):
    """Return the first valid float found among the given column names."""
    for col in cols:
        if col in row.index and pd.notna(row[col]):
            try:
                return float(row[col])
            except (ValueError, TypeError):
                continue
    return default

def safe_str(row, *cols, default=''):
    """Return the first non-empty string found among the given column names."""
    for col in cols:
        if col in row.index and pd.notna(row[col]):
            val = str(row[col]).strip()
            if val.lower() not in ('nan', ''):
                return val
    return default

# ════════════════════════════════════════════════════════════
# CONNECT
# ════════════════════════════════════════════════════════════
print("=" * 80)
print("🚀 ADVANCED MEAL IMPORTER WITH INGREDIENT BREAKDOWN (FIXED)")
print("=" * 80)

try:
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    cursor = conn.cursor()
    print("✅ Connected to database")
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    sys.exit(1)

# ════════════════════════════════════════════════════════════
# CLEAR EXISTING DATA
# ════════════════════════════════════════════════════════════
cursor.execute("SELECT COUNT(*) FROM meals")
existing = cursor.fetchone()[0]

if existing > 0:
    print(f"\n⚠️  {existing} meals already in database.")
    response = input("Delete all and start fresh? (yes/no): ")
    if response.lower() == 'yes':
        cursor.execute("TRUNCATE meals, meal_ingredients RESTART IDENTITY CASCADE")
        conn.commit()
        print("✅ Cleared existing data")
    else:
        print("Cancelled.")
        cursor.close(); conn.close(); sys.exit(0)

# ════════════════════════════════════════════════════════════
# LOAD CSV
# ════════════════════════════════════════════════════════════
try:
    df = pd.read_csv('meal_list.csv')
    print(f"✅ Loaded {len(df)} rows from CSV")
    print(f"\n📋 Columns found in CSV:\n   {list(df.columns)}\n")
except Exception as e:
    print(f"❌ Failed to load CSV: {e}")
    cursor.close(); conn.close(); sys.exit(1)

# ════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════
def detect_ingredients(meal_name):
    meal_lower = meal_name.lower()
    return [
        data.copy()
        for pattern, data in INGREDIENT_PATTERNS.items()
        if re.search(pattern, meal_lower)
    ]

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
        'calories': round(cal * m, 2),
        'protein':  round(prot * m, 2),
        'carbs':    round(carbs * m, 2),
        'fats':     round(fats * m, 2),
        'cost':     round((cost_kg / 1000.0) * grams, 2),
    }

# ════════════════════════════════════════════════════════════
# IMPORT LOOP
# ════════════════════════════════════════════════════════════
print(f"🚀 Importing {len(df)} meals...\n" + "=" * 80)

imported = skipped = total_links = 0
name = "unknown"

for idx, row in df.iterrows():
    try:
        # ── FIX #1: SAVEPOINT isolates each meal ─────────────────────────────
        # A failure here only rolls back THIS meal, not everything before it.
        cursor.execute("SAVEPOINT meal_sp")

        name      = safe_str(row, 'name', 'meal_name', 'title', default=f"Row {idx+2}")
        meal_type = safe_str(row, 'meal_type', 'type', 'category', default='lunch').lower()
        diet_tags_str = safe_str(row, 'diet_tags', 'diet_tag', 'tags')
        allergens_str = safe_str(row, 'allergens', 'allergen')

        diet_tags = [t.strip() for t in diet_tags_str.split(',') if t.strip() and t.lower() != 'nan']
        allergens = [t.strip() for t in allergens_str.split(',') if t.strip() and t.lower() != 'nan']

        # Build nutrition from detected ingredients
        detected = detect_ingredients(name)
        tot_cal = tot_prot = tot_carbs = tot_fats = tot_cost = 0.0
        links = []

        for ing in detected:
            iid = get_ingredient_id(ing['ingredient'])
            if iid:
                n = calc_nutrition(iid, ing['amount_g'])
                if n:
                    tot_cal   += n['calories']
                    tot_prot  += n['protein']
                    tot_carbs += n['carbs']
                    tot_fats  += n['fats']
                    tot_cost  += n['cost']
                    links.append({
                        'ingredient_id':  iid,
                        'amount_grams':   ing['amount_g'],
                        'display_amount': str(int(ing['amount_g'])) if ing['amount_g'] >= 1 else str(ing['amount_g']),
                        'display_unit':   ing['unit'],
                        **n,
                    })

        # ── FIX #2: safe fallback to CSV columns ─────────────────────────────
        if tot_cal > 0:
            calories, protein, carbs, fats, cost = tot_cal, tot_prot, tot_carbs, tot_fats, tot_cost
        else:
            calories = safe_float(row, 'calories', 'total_calories', 'calorie', 'kcal')
            protein  = safe_float(row, 'protein',  'total_protein',  'protein_g')
            carbs    = safe_float(row, 'carbs',    'total_carbs',    'carbohydrates', 'carbs_g')
            fats     = safe_float(row, 'fats',     'total_fats',     'fat', 'fat_g')
            cost     = safe_float(row, 'estimated_cost', 'cost', 'price', 'estimated_price')

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

        # Insert ingredient links
        # ── FIX #3: ON CONFLICT DO NOTHING skips duplicates silently ─────────
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
            print(f"   ✅ {imported}/{len(df)} meals done ({total_links} ingredient links)...")

    except Exception as e:
        # Roll back only this meal — everything before it is safe
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
print(f"✅ Imported : {imported} meals")
print(f"⚠️  Skipped  : {skipped} meals")
print(f"🔗 Links    : {total_links} ingredient links")
if imported:
    print(f"📊 Avg      : {total_links/imported:.1f} ingredients/meal")

print("\n" + "=" * 80)
print("VERIFICATION")
print("=" * 80)

cursor.execute("SELECT COUNT(*) FROM meals")
print(f"📊 Meals in DB: {cursor.fetchone()[0]}")

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
print(f"⚠️  Meals without ingredients: {cursor.fetchone()[0]}")
print("=" * 80)

cursor.close()
conn.close()
print("✅ Done!")