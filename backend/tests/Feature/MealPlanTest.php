<?php

namespace Tests\Feature;

use App\Models\Ingredient;
use App\Models\Meal;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MealPlanTest extends TestCase
{
    use RefreshDatabase;

    private function verifiedUserWithToken(): array
    {
        $user  = User::factory()->create(['email_verified_at' => now(), 'role' => 'user']);
        UserProfile::factory()->create([
            'user_id'        => $user->id,
            'caloric_target' => 2000,
            'protein_pct'    => 30,
            'carbs_pct'      => 45,
            'fats_pct'       => 25,
        ]);
        Meal::factory()->count(50)->create();
        Ingredient::factory()->count(100)->create();
        $token = $user->createToken('test')->plainTextToken;
        return [$user, $token];
    }

    #[Test]
    public function user_can_generate_a_meal_plan(): void
    {
        [$user, $token] = $this->verifiedUserWithToken();

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->postJson('/api/v1/meal-plan');

        $response->assertStatus(201)
                 ->assertJsonStructure(['data' => ['id', 'days']]);
    }

    #[Test]
    public function generated_meal_plan_has_correct_number_of_days(): void
    {
        [$user, $token] = $this->verifiedUserWithToken();

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->postJson('/api/v1/meal-plan', ['days' => 7]);

        $response->assertStatus(201);
        $this->assertCount(7, $response->json('data.days'));
    }

    #[Test]
    public function each_day_has_at_least_one_meal(): void
    {
        [$user, $token] = $this->verifiedUserWithToken();

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->postJson('/api/v1/meal-plan', ['days' => 3]);

        $response->assertStatus(201);

        foreach ($response->json('data.days') as $day) {
            $this->assertNotEmpty($day['meals']);
        }
    }

    #[Test]
    public function shopping_list_is_returned_for_active_plan(): void
    {
        [$user, $token] = $this->verifiedUserWithToken();

        $this->withHeader('Authorization', "Bearer $token")
             ->postJson('/api/v1/meal-plan');

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->getJson('/api/v1/meal-plan/shopping-list');

        $response->assertStatus(200)
                 ->assertJsonStructure(['items' => [['name', 'quantity', 'unit', 'cost']]]);
    }

    #[Test]
    public function shopping_list_returns_404_when_no_plan_exists(): void
    {
        [$user, $token] = $this->verifiedUserWithToken();

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->getJson('/api/v1/meal-plan/shopping-list');

        $response->assertStatus(404);
    }
}