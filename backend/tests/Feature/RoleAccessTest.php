<?php

namespace Tests\Feature;

use App\Models\Gym;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(string $role): array
    {
        $user  = User::factory()->create(['role' => $role, 'email_verified_at' => now()]);
        $token = $user->createToken('test')->plainTextToken;
        return [$user, $token];
    }

    #[Test]
    public function admin_can_access_admin_endpoints(): void
    {
        [, $token] = $this->tokenFor('admin');

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->getJson('/api/v1/admin/users');

        $response->assertStatus(200);
    }

    #[Test]
    public function regular_user_cannot_access_admin_endpoints(): void
    {
        [, $token] = $this->tokenFor('user');

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->getJson('/api/v1/admin/users');

        $response->assertStatus(403);
    }

    #[Test]
    public function gym_owner_cannot_access_admin_endpoints(): void
    {
        [, $token] = $this->tokenFor('gym_owner');

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->getJson('/api/v1/admin/users');

        $response->assertStatus(403);
    }

    #[Test]
    public function gym_owner_can_access_owner_portal(): void
    {
        [, $token] = $this->tokenFor('gym_owner');

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->getJson('/api/v1/owner/gyms');

        $response->assertStatus(200);
    }

    #[Test]
    public function regular_user_cannot_access_owner_portal(): void
    {
        [, $token] = $this->tokenFor('user');

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->getJson('/api/v1/owner/gyms');

        $response->assertStatus(403);
    }

    #[Test]
    public function gym_owner_cannot_modify_another_owners_gym(): void
    {
        [$owner1, $token] = $this->tokenFor('gym_owner');
        $owner2           = User::factory()->create(['role' => 'gym_owner']);
        $gym              = Gym::factory()->create(['owner_id' => $owner2->id]);

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->patchJson("/api/v1/owner/gyms/{$gym->id}", [
                             'name' => 'Hacked Gym Name',
                         ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function admin_can_toggle_maintenance_mode(): void
    {
        [, $token] = $this->tokenFor('admin');

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->patchJson('/api/v1/admin/maintenance', ['enabled' => true]);

        $response->assertStatus(200);
    }

    #[Test]
    public function regular_user_cannot_toggle_maintenance_mode(): void
    {
        [, $token] = $this->tokenFor('user');

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->patchJson('/api/v1/admin/maintenance', ['enabled' => true]);

        $response->assertStatus(403);
    }
}