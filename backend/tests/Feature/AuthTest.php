<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function user_can_register_with_valid_data(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name'                  => 'Juan dela Cruz',
            'email'                 => 'juan@example.com',
            'password'              => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(201)
                 ->assertJsonStructure(['message', 'user' => ['id', 'email']]);

        $this->assertDatabaseHas('users', ['email' => 'juan@example.com']);
    }

    #[Test]
    public function registration_fails_with_duplicate_email(): void
    {
        User::factory()->create(['email' => 'juan@example.com']);

        $response = $this->postJson('/api/v1/auth/register', [
            'name'                  => 'Juan dela Cruz',
            'email'                 => 'juan@example.com',
            'password'              => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['email']);
    }

    #[Test]
    public function registration_fails_with_missing_fields(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'juan@example.com',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['name', 'password']);
    }

    #[Test]
    public function registered_user_can_login(): void
    {
        User::factory()->create([
            'email'    => 'juan@example.com',
            'password' => bcrypt('Password123!'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'juan@example.com',
            'password' => 'Password123!',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['token', 'user']);
    }

    #[Test]
    public function login_fails_with_wrong_password(): void
    {
        User::factory()->create([
            'email'    => 'juan@example.com',
            'password' => bcrypt('CorrectPassword!'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'juan@example.com',
            'password' => 'WrongPassword!',
        ]);

        $response->assertStatus(401);
    }

    #[Test]
    public function login_fails_with_nonexistent_email(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'ghost@example.com',
            'password' => 'Password123!',
        ]);

        $response->assertStatus(401);
    }

    #[Test]
    public function authenticated_user_can_logout(): void
    {
        $user  = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->postJson('/api/v1/auth/logout');

        $response->assertStatus(200);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->id,
        ]);
    }

    #[Test]
    public function unauthenticated_request_to_protected_route_returns_401(): void
    {
        $response = $this->getJson('/api/v1/recommendations');
        $response->assertStatus(401);
    }
}