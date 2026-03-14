<?php

namespace App\Http\Controllers;

use App\Models\Meal;
use App\Models\MacroPreset;
use Illuminate\Http\Request;

class MealPlanController extends Controller
{
    const MEAL_DISTRIBUTION = [
        'breakfast' => ['cal' => 0.25, 'budget' => 0.20],
        'lunch'     => ['cal' => 0.40, 'budget' => 0.40],
        'dinner'    => ['cal' => 0.30, 'budget' => 0.35],
        'snack'     => ['cal' => 0.05, 'budget' => 0.05],
    ];

    public function generate(Request $request)
    {
        try {
            $request->validate([
                'days'                  => 'sometimes|integer|min:1|max:7',
                'total_calories'        => 'sometimes|numeric|min:500|max:10000',
                'budget'                => 'sometimes|numeric|min:50',
                'preset_id'             => 'sometimes|nullable|integer|exists:macro_presets,id',
                'custom_macros'         => 'sometimes|nullable|array',
                'custom_macros.protein' => 'required_with:custom_macros|integer|min:1|max:98',
                'custom_macros.carbs'   => 'required_with:custom_macros|integer|min:1|max:98',
                'custom_macros.fats'    => 'required_with:custom_macros|integer|min:1|max:98',
                'meal_types'            => 'sometimes|array',
                'meal_types.*'          => 'in:breakfast,lunch,dinner,snack',
                'diet_tags'             => 'sometimes|array',
                'avoid_allergens'       => 'sometimes|array',
            ]);

            $days           = (int) $request->input('days', 1);
            $totalCalories  = (float) $request->input('total_calories', 2000);
            $budget         = (float) $request->input('budget', 300);
            $mealTypes      = $request->input('meal_types', ['breakfast', 'lunch', 'dinner', 'snack']);
            $dietTags       = $request->input('diet_tags', []);
            $avoidAllergens = $request->input('avoid_allergens', []);

            $macros = $this->resolveMacros($totalCalories, $request);

            $warnings = [];
            $allMeals = $this->loadMeals($dietTags, $avoidAllergens, $warnings);

            $planDays = [];

            if ($allMeals->isEmpty()) {
                $warnings[] = 'No meals matched your current filters. Placeholder entries were added to keep the plan structure complete.';
            }

            for ($day = 1; $day <= $days; $day++) {
                $usedMealIds = [];

                $planDays[] = $this->buildDay(
                    $day,
                    $allMeals,
                    $mealTypes,
                    $totalCalories,
                    $budget,
                    $macros,
                    $usedMealIds,
                    $warnings
                );
            }

            $shoppingList = $this->buildShoppingList($planDays);
            $warnings = array_values(array_unique($warnings));

            return response()->json([
                'success' => true,
                'data'    => [
                    'summary' => [
                        'days'           => $days,
                        'daily_calories' => $totalCalories,
                        'daily_budget'   => $budget,
                        'macro_targets'  => $macros,
                        'meal_types'     => $mealTypes,
                    ],
                    'days'          => $planDays,
                    'shopping_list' => $shoppingList,
                    'warnings'      => $warnings,
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'errors'  => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate plan',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    private function resolveMacros(float $calories, Request $request): array
    {
        $p = 30;
        $c = 40;
        $f = 30;

        if ($request->filled('preset_id')) {
            $preset = MacroPreset::findOrFail($request->preset_id);
            $p = (int) $preset->protein_percent;
            $c = (int) $preset->carbs_percent;
            $f = (int) $preset->fats_percent;
        } elseif ($request->filled('custom_macros')) {
            $cm = $request->input('custom_macros', []);
            $p = (int) ($cm['protein'] ?? 30);
            $c = (int) ($cm['carbs'] ?? 40);
            $f = (int) ($cm['fats'] ?? 30);
        }

        return [
            'protein' => [
                'grams'   => round(($calories * $p / 100) / 4),
                'percent' => $p,
            ],
            'carbs' => [
                'grams'   => round(($calories * $c / 100) / 4),
                'percent' => $c,
            ],
            'fats' => [
                'grams'   => round(($calories * $f / 100) / 9),
                'percent' => $f,
            ],
        ];
    }

    private function loadMeals(array $dietTags, array $avoidAllergens, array &$warnings = [])
    {
        $meals = Meal::where('is_active', true)
            ->with('ingredients')
            ->get();

        if (!empty($dietTags)) {
            $normalizedSelectedTags = collect($dietTags)
                ->map(fn($tag) => strtolower(trim((string) $tag)))
                ->filter()
                ->values()
                ->all();

            $strictMeals = $meals->filter(function ($meal) use ($normalizedSelectedTags) {
                $tags = collect(is_array($meal->diet_tags) ? $meal->diet_tags : [])
                    ->map(fn($tag) => strtolower(trim((string) $tag)))
                    ->filter()
                    ->values()
                    ->all();

                foreach ($normalizedSelectedTags as $tag) {
                    if (!in_array($tag, $tags, true)) {
                        return false;
                    }
                }

                return true;
            })->values();

            if ($strictMeals->isNotEmpty()) {
                $meals = $strictMeals;
            } else {
                $relaxedMeals = $meals->filter(function ($meal) use ($normalizedSelectedTags) {
                    $tags = collect(is_array($meal->diet_tags) ? $meal->diet_tags : [])
                        ->map(fn($tag) => strtolower(trim((string) $tag)))
                        ->filter()
                        ->values()
                        ->all();

                    foreach ($normalizedSelectedTags as $tag) {
                        if (in_array($tag, $tags, true)) {
                            return true;
                        }
                    }

                    return false;
                })->values();

                if ($relaxedMeals->isNotEmpty()) {
                    $meals = $relaxedMeals;
                    $warnings[] = 'No meals matched all selected diet tags exactly, so partially matching meals were included.';
                } else {
                    $meals = collect();
                }
            }
        }

        if (!empty($avoidAllergens)) {
            $normalizedAvoidAllergens = collect($avoidAllergens)
                ->map(fn($allergen) => strtolower(trim((string) $allergen)))
                ->filter()
                ->values()
                ->all();

            $meals = $meals->filter(function ($meal) use ($normalizedAvoidAllergens) {
                $allergens = collect(is_array($meal->allergens) ? $meal->allergens : [])
                    ->map(fn($allergen) => strtolower(trim((string) $allergen)))
                    ->filter()
                    ->values()
                    ->all();

                foreach ($normalizedAvoidAllergens as $allergen) {
                    if (in_array($allergen, $allergens, true)) {
                        return false;
                    }
                }

                return true;
            })->values();
        }

        return $meals->values();
    }

    private function buildDay(
        int $dayNum,
        $allMeals,
        array $mealTypes,
        float $totalCalories,
        float $budget,
        array $macros,
        array &$usedMealIds,
        array &$warnings
    ): array {
        $meals = [];
        $totals = [
            'calories' => 0,
            'protein'  => 0,
            'carbs'    => 0,
            'fats'     => 0,
            'cost'     => 0,
        ];

        foreach ($mealTypes as $type) {
            $dist = self::MEAL_DISTRIBUTION[$type] ?? ['cal' => 0.25, 'budget' => 0.25];

            $selected = $this->selectMeal($allMeals, $type, [
                'calories' => $totalCalories * $dist['cal'],
                'budget'   => $budget * $dist['budget'],
                'protein'  => $macros['protein']['grams'] * $dist['cal'],
                'carbs'    => $macros['carbs']['grams'] * $dist['cal'],
                'fats'     => $macros['fats']['grams'] * $dist['cal'],
            ], $usedMealIds);

            $meal = $selected['meal'];
            $meta = $selected['match_meta'];

            if (!empty($meal['id']) && empty($meta['reused'])) {
                $usedMealIds[] = $meal['id'];
            }

            if (!empty($meta['warning'])) {
                $warnings[] = $meta['warning'];
            }

            $meals[] = $meal;

            $totals['calories'] += (float) $meal['total_calories'];
            $totals['protein']  += (float) $meal['total_protein'];
            $totals['carbs']    += (float) $meal['total_carbs'];
            $totals['fats']     += (float) $meal['total_fats'];
            $totals['cost']     += (float) $meal['estimated_cost'];
        }

        return [
            'day'             => $dayNum,
            'meals'           => $meals,
            'totals'          => [
                'calories' => round($totals['calories']),
                'protein'  => round($totals['protein']),
                'carbs'    => round($totals['carbs']),
                'fats'     => round($totals['fats']),
                'cost'     => round($totals['cost'], 2),
            ],
            'macro_breakdown' => $this->macroBreakdown($totals['protein'], $totals['carbs'], $totals['fats']),
            'adherence'       => $this->adherence($totals, $totalCalories, $macros),
        ];
    }

    private function selectMeal($allMeals, string $type, array $targets, array $usedMealIds): array
    {
        $normalizedType = strtolower(trim($type));

        $typeMeals = $allMeals->filter(function ($m) use ($normalizedType) {
            return strtolower(trim((string) $m->meal_type)) === $normalizedType;
        })->values();

        if ($typeMeals->isEmpty()) {
            return [
                'meal' => $this->makePlaceholderMeal($type, "No {$type} meal available"),
                'match_meta' => [
                    'strategy' => 'placeholder',
                    'reused'   => false,
                    'relaxed'  => true,
                    'warning'  => "No {$type} meals are currently available in the database.",
                ],
            ];
        }

        $scoreMeal = function ($m) use ($targets) {
            $err = fn($actual, $target) => $target > 0 ? abs($actual - $target) / $target : 0;

            $weightedError =
                $err((float) $m->total_calories, (float) $targets['calories']) * 0.30 +
                $err((float) $m->estimated_cost, (float) $targets['budget'])   * 0.15 +
                $err((float) $m->total_protein,  (float) $targets['protein'])  * 0.30 +
                $err((float) $m->total_carbs,    (float) $targets['carbs'])    * 0.15 +
                $err((float) $m->total_fats,     (float) $targets['fats'])     * 0.10;

            return max(0, 100 - ($weightedError * 100));
        };

        $pickMeal = function ($candidates, string $strategy, bool $reused, ?string $warning = null) use ($scoreMeal) {
            if ($candidates->isEmpty()) {
                return null;
            }

            $scored = $candidates->map(fn($m) => [
                'meal'  => $m,
                'score' => $scoreMeal($m),
            ])->sortByDesc('score')->values();

            $pickIndex = rand(0, min(4, $scored->count() - 1));
            $pick = $scored[$pickIndex]['meal'];

            $meal = $this->formatMeal($pick);
            $meal['match_meta'] = [
                'strategy' => $strategy,
                'reused'   => $reused,
                'relaxed'  => str_contains($strategy, 'loose'),
                'warning'  => $warning,
            ];

            return [
                'meal'       => $meal,
                'match_meta' => $meal['match_meta'],
            ];
        };

        $strictUnused = $typeMeals->filter(fn($m) =>
            !in_array($m->id, $usedMealIds, true) &&
            (float) $m->total_calories <= ((float) $targets['calories'] * 1.5) &&
            (float) $m->total_calories >= ((float) $targets['calories'] * 0.5) &&
            (float) $m->estimated_cost <= ((float) $targets['budget'] * 2)
        )->values();

        if ($result = $pickMeal($strictUnused, 'strict_unused', false)) {
            return $result;
        }

        $looseUnused = $typeMeals->filter(fn($m) =>
            !in_array($m->id, $usedMealIds, true)
        )->values();

        if ($result = $pickMeal(
            $looseUnused,
            'loose_unused',
            false,
            "No close {$type} match was found, so the closest unused option was selected."
        )) {
            return $result;
        }

        $strictReused = $typeMeals->filter(fn($m) =>
            (float) $m->total_calories <= ((float) $targets['calories'] * 1.5) &&
            (float) $m->total_calories >= ((float) $targets['calories'] * 0.5) &&
            (float) $m->estimated_cost <= ((float) $targets['budget'] * 2)
        )->values();

        if ($result = $pickMeal(
            $strictReused,
            'strict_reused',
            true,
            "A {$type} meal was reused to complete your plan."
        )) {
            return $result;
        }

        $looseReused = $typeMeals->values();

        if ($result = $pickMeal(
            $looseReused,
            'loose_reused',
            true,
            "No close unused {$type} match was available, so a reused closest option was selected."
        )) {
            return $result;
        }

        return [
            'meal' => $this->makePlaceholderMeal($type, "No {$type} meal available"),
            'match_meta' => [
                'strategy' => 'placeholder',
                'reused'   => false,
                'relaxed'  => true,
                'warning'  => "No {$type} meals could be selected for this plan.",
            ],
        ];
    }

    private function formatMeal($pick): array
    {
        return [
            'id'             => $pick->id,
            'name'           => $pick->name,
            'meal_type'      => $pick->meal_type,
            'total_calories' => round((float) $pick->total_calories, 1),
            'total_protein'  => round((float) $pick->total_protein, 1),
            'total_carbs'    => round((float) $pick->total_carbs, 1),
            'total_fats'     => round((float) $pick->total_fats, 1),
            'estimated_cost' => round((float) $pick->estimated_cost, 2),
            'diet_tags'      => is_array($pick->diet_tags) ? $pick->diet_tags : [],
            'allergens'      => is_array($pick->allergens) ? $pick->allergens : [],
            'ingredients'    => $pick->ingredients->map(function ($ing) {
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
                ];
            })->values()->toArray(),
        ];
    }

    private function makePlaceholderMeal(string $type, string $name): array
    {
        return [
            'id'             => null,
            'name'           => $name,
            'meal_type'      => $type,
            'total_calories' => 0,
            'total_protein'  => 0,
            'total_carbs'    => 0,
            'total_fats'     => 0,
            'estimated_cost' => 0,
            'diet_tags'      => [],
            'allergens'      => [],
            'ingredients'    => [],
            'unavailable'    => true,
            'match_meta'     => [
                'strategy' => 'placeholder',
                'reused'   => false,
                'relaxed'  => true,
                'warning'  => "No {$type} meals are currently available.",
            ],
        ];
    }

    private function buildShoppingList(array $days): array
    {
        $totals = [];

        foreach ($days as $day) {
            foreach ($day['meals'] as $meal) {
                foreach (($meal['ingredients'] ?? []) as $ing) {
                    $key = $ing['name'];

                    if (!isset($totals[$key])) {
                        $totals[$key] = [
                            'name'     => $ing['name'],
                            'category' => $ing['category'] ?? 'Other',
                            'grams'    => 0,
                            'cost'     => 0,
                        ];
                    }

                    $totals[$key]['grams'] += (float) ($ing['amount_grams'] ?? 0);
                    $totals[$key]['cost']  += (float) ($ing['cost'] ?? 0);
                }
            }
        }

        $list = collect(array_values($totals))->map(function ($item) {
            return [
                'name'           => $item['name'],
                'category'       => $item['category'],
                'amount'         => $item['grams'] >= 1000
                    ? round($item['grams'] / 1000, 2) . ' kg'
                    : round($item['grams']) . ' g',
                'estimated_cost' => round($item['cost'], 2),
            ];
        })->sortBy('category')->values();

        return [
            'by_category' => $list->groupBy('category')->map(fn($items) => $items->values()),
            'all_items'   => $list,
            'total_items' => $list->count(),
            'total_cost'  => round($list->sum('estimated_cost'), 2),
        ];
    }

    private function macroBreakdown(float $protein, float $carbs, float $fats): array
    {
        $totalCalories = ($protein * 4) + ($carbs * 4) + ($fats * 9);

        if ($totalCalories <= 0) {
            return [
                'protein' => 0,
                'carbs'   => 0,
                'fats'    => 0,
            ];
        }

        return [
            'protein' => round(($protein * 4 / $totalCalories) * 100),
            'carbs'   => round(($carbs * 4 / $totalCalories) * 100),
            'fats'    => round(($fats * 9 / $totalCalories) * 100),
        ];
    }

    private function adherence(array $totals, float $targetCalories, array $macros): array
    {
        $score = fn($actual, $target) => $target > 0
            ? max(0, round(100 - (abs($actual - $target) / $target * 100)))
            : 100;

        $calories = $score((float) $totals['calories'], $targetCalories);
        $protein  = $score((float) $totals['protein'], (float) $macros['protein']['grams']);
        $carbs    = $score((float) $totals['carbs'], (float) $macros['carbs']['grams']);
        $fats     = $score((float) $totals['fats'], (float) $macros['fats']['grams']);

        return [
            'overall'  => round(($calories + $protein + $carbs + $fats) / 4),
            'calories' => $calories,
            'protein'  => $protein,
            'carbs'    => $carbs,
            'fats'     => $fats,
        ];
    }
}