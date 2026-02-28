<?php

namespace App\Http\Controllers;

use App\Models\Meal;
use Illuminate\Http\Request;

class MealController extends Controller
{
    /**
     * GET /api/meals
     * Get all active meals WITH ingredients
     */
    public function index()
    {
        try {
            $meals = Meal::where('is_active', true)
                ->with('ingredients')  // ← ADD THIS!
                ->get()
                ->map(function ($meal) {
                    return $this->formatMealWithIngredients($meal);
                });

            return response()->json([
                'success' => true,
                'data'    => $meals,
                'count'   => $meals->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch meals',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/meals/{id}
     * Get single meal with ingredients
     */
    public function show($id)
    {
        try {
            $meal = Meal::with('ingredients')->findOrFail($id);

            return response()->json([
                'success' => true,
                'data'    => $this->formatMealWithIngredients($meal),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Meal not found'], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch meal',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/meals/type/{type}
     * Get meals filtered by type WITH ingredients
     */
    public function getByType($type)
    {
        try {
            $validTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

            if (!in_array($type, $validTypes)) {
                return response()->json(['success' => false, 'message' => 'Invalid meal type'], 400);
            }

            $meals = Meal::where('is_active', true)
                ->where('meal_type', $type)
                ->with('ingredients')  // ← ADD THIS!
                ->get()
                ->map(function ($meal) {
                    return $this->formatMealWithIngredients($meal);
                });

            return response()->json([
                'success' => true,
                'data'    => $meals,
                'count'   => $meals->count(),
                'type'    => $type,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch meals',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/meals/filter?tags[]=vegetarian&tags[]=halal
     * Filter by diet tags
     */
    public function filterByDiet(Request $request)
    {
        try {
            $dietTags = $request->input('tags', []);

            if (empty($dietTags)) return $this->index();

            $meals = Meal::where('is_active', true)
                ->with('ingredients')  // ← ADD THIS!
                ->get()
                ->filter(function ($meal) use ($dietTags) {
                    $tags = $meal->diet_tags ?? [];
                    foreach ($dietTags as $tag) {
                        if (!in_array($tag, $tags)) return false;
                    }
                    return true;
                })
                ->values()
                ->map(function ($meal) {
                    return $this->formatMealWithIngredients($meal);
                });

            return response()->json([
                'success' => true,
                'data'    => $meals,
                'count'   => $meals->count(),
                'filters' => $dietTags,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to filter meals',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/meals/stats
     * Meal statistics
     */
    public function stats()
    {
        try {
            $stats = [
                'total_meals' => Meal::where('is_active', true)->count(),
                'by_type'     => [
                    'breakfast' => Meal::where('is_active', true)->where('meal_type', 'breakfast')->count(),
                    'lunch'     => Meal::where('is_active', true)->where('meal_type', 'lunch')->count(),
                    'dinner'    => Meal::where('is_active', true)->where('meal_type', 'dinner')->count(),
                    'snack'     => Meal::where('is_active', true)->where('meal_type', 'snack')->count(),
                ],
                'avg_cost'     => round(Meal::where('is_active', true)->avg('estimated_cost'), 2),
                'avg_calories' => round(Meal::where('is_active', true)->avg('total_calories'), 1),
                'avg_protein'  => round(Meal::where('is_active', true)->avg('total_protein'), 1),
                'avg_carbs'    => round(Meal::where('is_active', true)->avg('total_carbs'), 1),
                'avg_fats'     => round(Meal::where('is_active', true)->avg('total_fats'), 1),
            ];

            return response()->json(['success' => true, 'data' => $stats]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get stats',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Format meal with ingredients array
     * This ensures consistent format across all endpoints
     */
    private function formatMealWithIngredients($meal): array
    {
        $ingredients = $meal->ingredients->map(function ($ing) use ($meal) {
            return [
                'id'             => $ing->id,
                'name'           => $ing->name,
                'category'       => $ing->category,
                'amount_grams'   => (float) $ing->pivot->amount_grams,
                'display_amount' => $ing->pivot->display_amount,
                'display_unit'   => $ing->pivot->display_unit,
                'calories'       => (float) $ing->pivot->calories,
                'protein'        => (float) $ing->pivot->protein,
                'carbs'          => (float) $ing->pivot->carbs,
                'fats'           => (float) $ing->pivot->fats,
                'cost'           => (float) $ing->pivot->cost,
                'pct_of_calories' => $meal->total_calories > 0
                    ? round($ing->pivot->calories / $meal->total_calories * 100)
                    : 0,
            ];
        });

        return [
            'id'             => $meal->id,
            'name'           => $meal->name,
            'meal_type'      => $meal->meal_type,
            'description'    => $meal->description,
            'total_calories' => (float) $meal->total_calories,
            'total_protein'  => (float) $meal->total_protein,
            'total_carbs'    => (float) $meal->total_carbs,
            'total_fats'     => (float) $meal->total_fats,
            'estimated_cost' => (float) $meal->estimated_cost,
            'diet_tags'      => $meal->diet_tags ?? [],
            'allergens'      => $meal->allergens ?? [],
            'serving_size'   => $meal->serving_size,
            'prep_time'      => $meal->prep_time,
            'cook_time'      => $meal->cook_time,
            'instructions'   => $meal->instructions,
            'cooking_tips'   => $meal->cooking_tips,
            'ingredients'    => $ingredients,
            'macro_breakdown'=> $this->macroBreakdown(
                $meal->total_protein,
                $meal->total_carbs,
                $meal->total_fats
            ),
        ];
    }

    /**
     * Calculate macro percentage breakdown
     */
    private function macroBreakdown(float $protein, float $carbs, float $fats): array
    {
        $total = ($protein * 4) + ($carbs * 4) + ($fats * 9);
        if ($total <= 0) return ['protein' => 0, 'carbs' => 0, 'fats' => 0];

        return [
            'protein' => round($protein * 4 / $total * 100),
            'carbs'   => round($carbs * 4 / $total * 100),
            'fats'    => round($fats * 9 / $total * 100),
        ];
    }
}