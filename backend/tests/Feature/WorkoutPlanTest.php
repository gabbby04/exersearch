<?php

namespace Tests\Feature;

use App\Models\Exercise;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\WorkoutTemplate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class WorkoutPlanTest extends TestCase
{
    use RefreshDatabase;

    private function verifiedUserWithToken(int $daysPerWeek = 5): array
    {
        $user  = User::factory()->create(['email_verified_at' => now(), 'role' => 'user']);
        UserProfile::factory()->create([
            'user_id'       => $user->id,
            'days_per_week' => $daysPerWeek,
        ]);
        WorkoutTemplate::factory()->count(3)->create();
        Exercise::factory()->count(50)->create();
        $token = $user->createToken('test')->plainTextToken;
        return [$user, $token];
    }

    #[Test]
    public function user_can_generate_a_workout_plan(): void
    {
        [$user, $token] = $this->verifiedUserWithToken();

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->postJson('/api/v1/workout-plan');

        $response->assertStatus(201)
                 ->assertJsonStructure(['data' => ['id', 'split', 'days']]);
    }

    #[Test]
    public function five_day_schedule_produces_ppl_split(): void
    {
        [$user, $token] = $this->verifiedUserWithToken(5);

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->postJson('/api/v1/workout-plan');

        $response->assertStatus(201)
                 ->assertJsonPath('data.split', 'ppl');
    }

    #[Test]
    public function three_day_schedule_produces_full_body_split(): void
    {
        [$user, $token] = $this->verifiedUserWithToken(3);

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->postJson('/api/v1/workout-plan');

        $response->assertStatus(201)
                 ->assertJsonPath('data.split', 'full_body');
    }

    #[Test]
    public function four_day_schedule_produces_upper_lower_split(): void
    {
        [$user, $token] = $this->verifiedUserWithToken(4);

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->postJson('/api/v1/workout-plan');

        $response->assertStatus(201)
                 ->assertJsonPath('data.split', 'upper_lower');
    }

    #[Test]
    public function plan_is_replaced_on_regeneration(): void
    {
        [$user, $token] = $this->verifiedUserWithToken();

        $this->withHeader('Authorization', "Bearer $token")->postJson('/api/v1/workout-plan');
        $this->withHeader('Authorization', "Bearer $token")->postJson('/api/v1/workout-plan');

        $this->assertDatabaseCount('workout_plans', 1);
    }

    #[Test]
    public function swap_endpoint_returns_alternative_exercises(): void
    {
        [$user, $token] = $this->verifiedUserWithToken();

        $plan = $this->withHeader('Authorization', "Bearer $token")
                     ->postJson('/api/v1/workout-plan')
                     ->json('data');

        $firstExerciseId = $plan['days'][0]['exercises'][0]['id'];

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->postJson('/api/v1/workout-plan/swap', [
                             'plan_day_id' => $plan['days'][0]['id'],
                             'exercise_id' => $firstExerciseId,
                         ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['alternatives' => [['id', 'name', 'score']]]);
    }
}