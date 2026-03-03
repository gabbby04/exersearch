<?php

namespace App\Http\Controllers;

use App\Models\Gym;
use App\Models\GymFreeVisit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use App\Services\NotificationService;

class GymFreeVisitController extends Controller
{
    public function claim(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $gym = Gym::where('gym_id', $gymId)
            ->where('status', 'approved')
            ->first();

        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        if (!$gym->free_first_visit_enabled) {
            return response()->json(['message' => 'Free first visit is not enabled for this gym'], 409);
        }

        $existing = GymFreeVisit::where('gym_id', $gymId)
            ->where('user_id', $user->user_id)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Free visit already claimed',
                'free_visit' => $existing,
            ], 200);
        }

        $row = GymFreeVisit::create([
            'gym_id' => $gymId,
            'user_id' => $user->user_id,
            'status' => 'claimed',
            'claimed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Free visit claimed',
            'free_visit' => $row,
        ], 201);
    }

    public function myFreeVisits(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $rows = GymFreeVisit::with(['gym'])
            ->where('user_id', $user->user_id)
            ->orderByDesc('created_at')
            ->paginate((int)($request->query('per_page', 20)));

        return response()->json($rows);
    }

    public function ownerList(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        if (!in_array($user->role, ['owner', 'admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $gym = Gym::where('gym_id', $gymId)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        if ($user->role === 'owner' && (int)$gym->owner_id !== (int)$user->user_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'status' => ['nullable', Rule::in(['claimed', 'used', 'cancelled', 'expired'])],
            'q' => ['nullable', 'string', 'max:200'],
        ]);

        $q = GymFreeVisit::with(['user', 'usedByOwner'])
            ->where('gym_id', $gymId);

        if ($request->filled('status')) {
            $q->where('status', $request->query('status'));
        }

        if ($request->filled('q')) {
            $search = $request->query('q');
            $q->whereHas('user', function ($uq) use ($search) {
                $uq->where('name', 'ilike', "%{$search}%")
                   ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $rows = $q->orderByDesc('created_at')
            ->paginate((int)($request->query('per_page', 20)));

        return response()->json($rows);
    }

    public function ownerMarkUsed(Request $request, $freeVisitId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        if (!in_array($user->role, ['owner', 'admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $row = GymFreeVisit::where('free_visit_id', $freeVisitId)->first();
        if (!$row) return response()->json(['message' => 'Free visit not found'], 404);

        $gym = Gym::where('gym_id', $row->gym_id)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        if ($user->role === 'owner' && (int)$gym->owner_id !== (int)$user->user_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($row->status !== 'claimed') {
            return response()->json(['message' => 'Only claimed free visits can be marked used'], 409);
        }

        $row->update([
            'status' => 'used',
            'used_at' => now(),
            'used_by_owner_id' => $user->user_id,
        ]);

        return response()->json([
            'message' => 'Free visit marked used',
            'free_visit' => $row->fresh(),
        ]);
    }

    public function ownerToggleEnabled(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        if (!in_array($user->role, ['owner', 'admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $gym = Gym::where('gym_id', (int) $gymId)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        if ($user->role === 'owner' && (int)$gym->owner_id !== (int)$user->user_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate(['enabled' => ['required', 'boolean']]);
        $enabled = (bool) $request->input('enabled');

        $wasEnabled = (bool) $gym->free_first_visit_enabled;
        $lastEnabledAt = $gym->free_first_visit_enabled_at;

        $gym->update([
            'free_first_visit_enabled' => $enabled,
            'free_first_visit_enabled_at' => $enabled
                ? now()
                : $gym->free_first_visit_enabled_at,
        ]);

        if (!$wasEnabled && $enabled) {
            $cooldownDays = 7;

            if (!$lastEnabledAt || $lastEnabledAt->lt(now()->subDays($cooldownDays))) {
                NotificationService::notifySavedUsersFreeVisitEnabled(
                    $gym->fresh(),
                    $user,
                    $cooldownDays
                );
            }
        }

        return response()->json([
            'message' => 'Free first visit setting updated',
            'gym' => $gym->fresh(),
        ]);
    }

    public function listEnabledGyms(Request $request)
    {
        $limit = max(1, min((int)($request->query('limit', 6)), 20));

        $rows = Gym::query()
            ->where('status', 'approved')
            ->where('free_first_visit_enabled', true)
            ->orderByDesc('free_first_visit_enabled_at')
            ->limit($limit)
            ->get([
                'gym_id',
                'name',
                'address',
                'latitude',
                'longitude',
                'daily_price',
                'monthly_price',
                'gym_type',
                'main_image_url',
                'free_first_visit_enabled',
                'free_first_visit_enabled_at',
            ]);

        return response()->json(['data' => $rows]);
    }
}