<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class UserProfileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'           => User::factory(),
            'age'               => $this->faker->numberBetween(18, 55),
            'weight'            => $this->faker->randomFloat(2, 50, 120),
            'height'            => $this->faker->randomFloat(2, 150, 200),
            'address'           => $this->faker->address(),
            'latitude'          => $this->faker->latitude(14.55, 14.62),
            'longitude'         => $this->faker->longitude(121.05, 121.12),
            'profile_photo_url' => null,
            'gender'            => $this->faker->randomElement(['male', 'female']),
        ];
    }
}