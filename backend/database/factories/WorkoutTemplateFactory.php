<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class WorkoutTemplateFactory extends Factory
{
    public function definition(): array
    {
        $days = $this->faker->numberBetween(1, 6);

        $split = match(true) {
            $days <= 3  => 'full_body',
            $days === 4 => 'upper_lower',
            default     => 'ppl',
        };

        return [
            'goal'                 => $this->faker->randomElement(['weight_loss', 'muscle_gain', 'endurance', 'maintenance']),
            'level'                => $this->faker->randomElement(['beginner', 'intermediate', 'advanced']),
            'days_per_week'        => $days,
            'session_minutes_min'  => 30,
            'session_minutes_max'  => 60,
            'split_type'           => $split,
            'duration_weeks'       => $this->faker->numberBetween(4, 12),
            'notes'                => $this->faker->sentence(),
        ];
    }
}