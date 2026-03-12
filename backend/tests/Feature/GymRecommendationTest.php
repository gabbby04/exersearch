<?php

namespace Tests\Feature;

use App\Models\Gym;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class GymRecommendationTest extends TestCase
{
    use RefreshDatabase;

    private function verifiedUserWithToken(): array
    {
        $user  = User::factory()->create(['email_verified_at' => now(), 'role' => 'user']);
        UserProfile::factory()->create(['user_id' => $user->id]);
        $token = $user->createToken('test')->plainTextToken;
        return [$user, $token];
    }

    #[Test]
    public function verified_user_can_request_gym_recommendations(): void
    {
        [$user, $token] = $this->verifiedUserWithToken();
        Gym::factory()->count(5)->create(['status' => 'approved']);

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->postJson('/api/v1/recommendations');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => [['id', 'name', 'score']]]);
    }

    #[Test]
    public function unverified_user_cannot_access_recommendations(): void
    {
        $user  = User::factory()->create(['email_verified_at' => null]);
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->postJson('/api/v1/recommendations');

        $response->assertStatus(403);
    }

    #[Test]
    public function recommendation_returns_empty_when_no_gyms_pass_filter(): void
    {
        [$user, $token] = $this->verifiedUserWithToken();

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->postJson('/api/v1/recommendations');

        $response->assertStatus(200)
                 ->assertJson(['data' => []]);
    }

    #[Test]
    public function recommendation_scores_are_between_zero_and_one(): void
    {
        [$user, $token] = $this->verifiedUserWithToken();
        Gym::factory()->count(3)->create(['status' => 'approved']);

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->postJson('/api/v1/recommendations');

        $response->assertStatus(200);

        foreach ($response->json('data') as $gym) {
            $this->assertGreaterThanOrEqual(0.0, $gym['score']);
            $this->assertLessThanOrEqual(1.0, $gym['score']);
        }
    }

    #[Test]
    public function results_are_returned_in_descending_score_order(): void
    {
        [$user, $token] = $this->verifiedUserWithToken();
        Gym::factory()->count(5)->create(['status' => 'approved']);

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->postJson('/api/v1/recommendations');

        $scores = array_column($response->json('data'), 'score');
        $sorted = $scores;
        rsort($sorted);

        $this->assertEquals($sorted, $scores);
    }

    #[Test]
    public function user_can_save_a_gym(): void
    {
        [$user, $token] = $this->verifiedUserWithToken();
        $gym = Gym::factory()->create(['status' => 'approved']);

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->postJson("/api/v1/gyms/{$gym->id}/save");

        $response->assertStatus(200);
        $this->assertDatabaseHas('saved_gyms', [
            'user_id' => $user->id,
            'gym_id'  => $gym->id,
        ]);
    }
}