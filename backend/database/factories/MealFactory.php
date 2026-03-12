<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class MealFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'            => $this->faker->unique()->words(3, true),
            'meal_type'       => $this->faker->randomElement(['breakfast', 'lunch', 'dinner', 'snack']),
            'total_calories'  => $this->faker->numberBetween(200, 900),
            'total_protein'   => $this->faker->randomFloat(1, 10, 60),
            'total_carbs'     => $this->faker->randomFloat(1, 20, 100),
            'total_fats'      => $this->faker->randomFloat(1, 5, 40),
            'estimated_cost'  => $this->faker->randomFloat(2, 50, 300),
            'diet_tags'       => json_encode($this->faker->randomElements(['vegan', 'vegetarian', 'keto', 'halal', 'gluten_free'], 1)),
            'allergens'       => json_encode([]),
            'is_active'       => true,
            'description'     => $this->faker->sentence(),
            'serving_size'    => $this->faker->numberBetween(100, 400) . 'g',
            'prep_time'       => $this->faker->numberBetween(5, 30),
            'cook_time'       => $this->faker->numberBetween(5, 60),
            'instructions'    => $this->faker->paragraph(),
            'cooking_tips'    => $this->faker->sentence(),
        ];
    }
}