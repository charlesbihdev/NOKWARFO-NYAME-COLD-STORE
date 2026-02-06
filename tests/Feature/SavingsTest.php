<?php

namespace Tests\Feature;

use App\Models\Saving;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SavingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_login(): void
    {
        $this->get('/savings')->assertRedirect('/login');
    }

    public function test_authenticated_users_can_view_savings_index(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/savings')
            ->assertOk();
    }

    public function test_can_create_savings(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/savings', [
                'name' => 'Test Savings',
                'description' => 'Test description',
                'date' => '2026-02-06',
            ])
            ->assertRedirect('/savings');

        $this->assertDatabaseHas('savings', [
            'name' => 'Test Savings',
            'description' => 'Test description',
        ]);
    }

    public function test_savings_name_must_be_unique(): void
    {
        $user = User::factory()->create();
        Saving::factory()->create(['name' => 'Unique Savings']);

        $this->actingAs($user)
            ->post('/savings', [
                'name' => 'Unique Savings',
                'date' => '2026-02-06',
            ])
            ->assertSessionHasErrors('name');
    }

    public function test_can_view_savings_detail(): void
    {
        $user = User::factory()->create();
        $saving = Saving::factory()->create();

        $this->actingAs($user)
            ->get("/savings/{$saving->id}")
            ->assertOk();
    }

    public function test_can_update_savings(): void
    {
        $user = User::factory()->create();
        $saving = Saving::factory()->create(['name' => 'Old Name']);

        $this->actingAs($user)
            ->put("/savings/{$saving->id}", [
                'name' => 'New Name',
                'description' => 'Updated description',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('savings', [
            'id' => $saving->id,
            'name' => 'New Name',
        ]);
    }

    public function test_can_archive_savings(): void
    {
        $user = User::factory()->create();
        $saving = Saving::factory()->create(['is_active' => true]);

        $this->actingAs($user)
            ->patch("/savings/{$saving->id}/archive")
            ->assertRedirect();

        $this->assertDatabaseHas('savings', [
            'id' => $saving->id,
            'is_active' => false,
        ]);
    }

    public function test_can_restore_archived_savings(): void
    {
        $user = User::factory()->create();
        $saving = Saving::factory()->create(['is_active' => false]);

        $this->actingAs($user)
            ->patch("/savings/{$saving->id}/archive")
            ->assertRedirect();

        $this->assertDatabaseHas('savings', [
            'id' => $saving->id,
            'is_active' => true,
        ]);
    }

    public function test_savings_search_filters_by_name(): void
    {
        $user = User::factory()->create();
        Saving::factory()->create(['name' => 'Target Savings']);
        Saving::factory()->create(['name' => 'Other Savings']);

        $response = $this->actingAs($user)
            ->get('/savings?search=Target')
            ->assertOk();

        $response->assertInertia(
            fn($page) => $page
                ->has('savings.data', 1)
        );
    }
}
