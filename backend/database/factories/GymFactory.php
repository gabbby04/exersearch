<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class GymFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'                        => $this->faker->company() . ' Gym',
            'description'                 => $this->faker->sentence(),
            'owner_id'                    => User::factory()->create(['role' => 'gym_owner'])->id,
            'address'                     => $this->faker->address(),
            'latitude'                    => $this->faker->latitude(14.55, 14.62),
            'longitude'                   => $this->faker->longitude(121.05, 121.12),
            'daily_price'                 => $this->faker->randomFloat(2, 50, 200),
            'monthly_price'               => $this->faker->randomFloat(2, 500, 2000),
            'annual_price'                => $this->faker->randomFloat(2, 5000, 20000),
            'opening_time'                => '06:00:00',
            'closing_time'                => '22:00:00',
            'gym_type'                    => $this->faker->randomElement(['commercial', 'boutique', 'crossfit', 'yoga']),
            'contact_number'              => $this->faker->phoneNumber(),
            'email'                       => $this->faker->companyEmail(),
            'website'                     => null,
            'facebook_page'               => null,
            'instagram_page'              => null,
            'main_image_url'              => null,
            'gallery_urls'                => json_encode([]),
            'has_personal_trainers'       => $this->faker->boolean(),
            'has_classes'                 => $this->faker->boolean(),
            'is_24_hours'                 => false,
            'is_airconditioned'           => $this->faker->boolean(),
            'free_first_visit_enabled'    => false,
            'free_first_visit_enabled_at' => null,
            'status'                      => 'approved',
            'approved_at'                 => now(),
            'approved_by'                 => null,
            'is_announcement_blocked'     => false,
            'announcement_blocked_at'     => null,
            'announcement_blocked_by'     => null,
        ];
    }
}