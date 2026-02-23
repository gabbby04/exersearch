<?php

namespace App\Http\Controllers;

use App\Models\Gym;
use App\Models\GymMembership;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class GymMembershipController extends Controller
{
    public function intent(Request $request, $gymId)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $gym = Gym::where('gym_id', $gymId)->first();
        if (!$gym) {
            return response()->json(['message' => 'Gym not found'], 404);
        }

        $request->validate([
            'plan_type' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $active = GymMembership::where('gym_id', $gymId)
            ->where('user_id', $user->user_id)
            ->where('status', 'active')
            ->first();

        if ($active) {
            return response()->json(['message' => 'Membership already active'], 409);
        }

        $existingIntent = GymMembership::where('gym_id', $gymId)
            ->where('user_id', $user->user_id)
            ->where('status', 'intent')
            ->first();

        if ($existingIntent) {
            $existingIntent->update([
                'plan_type' => $request->input('plan_type', $existingIntent->plan_type),
                'notes' => $request->input('notes', $existingIntent->notes),
            ]);

            return response()->json([
                'message' => 'Intent already exists (updated)',
                'membership' => $existingIntent,
            ]);
        }

        $membership = GymMembership::create([
            'gym_id' => $gymId,
            'user_id' => $user->user_id,
            'status' => 'intent',
            'plan_type' => $request->input('plan_type'),
            'notes' => $request->input('notes'),
        ]);

        return response()->json([
            'message' => 'Membership intent created',
            'membership' => $membership,
        ], 201);
    }

    public function myMemberships(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $rows = GymMembership::with(['gym'])
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
            'status' => ['nullable', Rule::in(['intent', 'active', 'expired', 'cancelled', 'rejected'])],
            'q' => ['nullable', 'string', 'max:200'],
        ]);

        $q = GymMembership::with(['user'])
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

    public function ownerActivate(Request $request, $membershipId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        if (!in_array($user->role, ['owner', 'admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $membership = GymMembership::where('membership_id', $membershipId)->first();
        if (!$membership) return response()->json(['message' => 'Membership not found'], 404);

        $gym = Gym::where('gym_id', $membership->gym_id)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);
        if ($user->role === 'owner' && (int)$gym->owner_id !== (int)$user->user_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'plan_type' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if (!in_array($membership->status, ['intent', 'expired'])) {
            return response()->json(['message' => 'Only intent/expired memberships can be activated'], 409);
        }

        $existingActive = GymMembership::where('gym_id', $membership->gym_id)
            ->where('user_id', $membership->user_id)
            ->where('status', 'active')
            ->where('membership_id', '!=', $membership->membership_id)
            ->first();

        if ($existingActive) {
            return response()->json(['message' => 'User already has an active membership for this gym'], 409);
        }

        $membership->update([
            'status' => 'active',
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'activated_at' => now(),
            'plan_type' => $request->input('plan_type', $membership->plan_type),
            'notes' => $request->input('notes', $membership->notes),
            'cancelled_at' => null,
        ]);

        return response()->json([
            'message' => 'Membership activated',
            'membership' => $membership->fresh(),
        ]);
    }

    public function ownerUpdateStatus(Request $request, $membershipId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        if (!in_array($user->role, ['owner', 'admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $membership = GymMembership::where('membership_id', $membershipId)->first();
        if (!$membership) return response()->json(['message' => 'Membership not found'], 404);

        $gym = Gym::where('gym_id', $membership->gym_id)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);
        if ($user->role === 'owner' && (int)$gym->owner_id !== (int)$user->user_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'status' => ['required', Rule::in(['intent', 'active', 'expired', 'cancelled', 'rejected'])],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $next = $request->input('status');

        $payload = [
            'status' => $next,
            'notes' => $request->input('notes', $membership->notes),
        ];

        if ($request->filled('start_date')) $payload['start_date'] = $request->input('start_date');
        if ($request->filled('end_date')) $payload['end_date'] = $request->input('end_date');

        if ($next === 'cancelled') {
            $payload['cancelled_at'] = now();
        }

        $membership->update($payload);

        return response()->json([
            'message' => 'Membership updated',
            'membership' => $membership->fresh(),
        ]);
    }
}