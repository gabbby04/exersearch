<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class ExerciseFactory extends Factory
{
    public function definition(): array
    {
        $muscles = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'core', 'calves'];
        $equipmentList = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'resistance_band'];

        return [
            'name'               => $this->faker->unique()->words(3, true),
            'primary_muscle'     => $this->faker->randomElement($muscles),
            'secondary_muscles'  => json_encode($this->faker->randomElements($muscles, 2)),
            'equipment'          => $this->faker->randomElement($equipmentList),
            'difficulty'         => $this->faker->randomElement(['beginner', 'intermediate', 'advanced']),
            'instructions'       => $this->faker->paragraph(),
            'external_source'    => null,
            'external_id'        => null,
        ];
    }
}