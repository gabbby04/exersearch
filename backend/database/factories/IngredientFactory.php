<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class IngredientFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'                 => $this->faker->unique()->word(),
            'category'             => $this->faker->randomElement(['protein', 'carbs', 'vegetables', 'fruits', 'dairy', 'fats']),
            'calories_per_100g'    => $this->faker->randomFloat(2, 10, 500),
            'protein_per_100g'     => $this->faker->randomFloat(2, 0, 35),
            'carbs_per_100g'       => $this->faker->randomFloat(2, 0, 80),
            'fats_per_100g'        => $this->faker->randomFloat(2, 0, 30),
            'fiber_per_100g'       => $this->faker->randomFloat(2, 0, 15),
            'sodium_per_100g'      => $this->faker->randomFloat(2, 0, 500),
            'iron_per_100g'        => $this->faker->randomFloat(2, 0, 10),
            'calcium_per_100g'     => $this->faker->randomFloat(2, 0, 200),
            'vitamin_c_per_100g'   => $this->faker->randomFloat(2, 0, 100),
            'average_cost_per_kg'  => $this->faker->randomFloat(2, 30, 500),
            'typical_unit'         => $this->faker->randomElement(['g', 'kg', 'piece', 'cup', 'tbsp']),
            'unit_weight_grams'    => $this->faker->randomFloat(2, 10, 500),
            'common_stores'        => json_encode(['SM Supermarket', 'Puregold']),
            'seasonality'          => $this->faker->randomElement(['all_year', 'seasonal']),
            'allergen_tags'        => json_encode([]),
            'diet_compatible'      => json_encode(['vegan', 'vegetarian']),
            'is_active'            => true,
        ];
    }
}