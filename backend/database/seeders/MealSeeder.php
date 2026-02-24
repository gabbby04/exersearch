<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Meal;

class MealSeeder extends Seeder
{
    public function run(): void
    {
        $file = fopen(database_path('seeders/data/meal_list.csv'), 'r');
        $header = fgetcsv($file); // skip header row

        $allMeals = [];

        while ($row = fgetcsv($file)) {
            $allMeals[] = array_combine($header, $row);
        }

        fclose($file);

        shuffle($allMeals);

        foreach ($allMeals as $meal) {
            Meal::create([
                'name'           => $meal['name'],
                'meal_type'      => $meal['meal_type'],
                'calories'       => (int) $meal['calories'],
                'protein'        => (int) $meal['protein'],
                'carbs'          => (int) $meal['carbs'],
                'fats'           => (int) $meal['fats'],
                'estimated_cost' => (int) $meal['estimated_cost'],
                'diet_tags'      => $meal['diet_tags'] ? explode(',', $meal['diet_tags']) : [],
                'allergens'      => $meal['allergens'] ? explode(',', $meal['allergens']) : [],
            ]);
        }
    }
}