<?php

namespace App\Http\Controllers;

use App\Models\Gym;
use App\Models\GymFreeVisit;
use App\Models\GymMembership;
use App\Models\GymRating;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GymRatingController extends Controller
{
    private function isVerifiedVisitor($userId, $gymId): array
    {
        $usedFreeVisit = GymFreeVisit::where('gym_id', $gymId)
            ->where('user_id', $userId)
            ->where('status', 'used')
            ->orderByDesc('used_at')
            ->first();

        if ($usedFreeVisit) {
            return [
                'verified' => true,
                'via' => 'free_visit_used',
                'ref_id' => (int)$usedFreeVisit->free_visit_id,
            ];
        }

        $membership = GymMembership::where('gym_id', $gymId)
            ->where('user_id', $userId)
            ->whereIn('status', ['active', 'expired'])
            ->orderByDesc('updated_at')
            ->first();

        if ($membership) {
            return [
                'verified' => true,
                'via' => 'membership',
                'ref_id' => (int)$membership->membership_id,
            ];
        }

        return [
            'verified' => false,
            'via' => null,
            'ref_id' => null,
        ];
    }

    public function upsertMyRating(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $gym = Gym::where('gym_id', $gymId)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        $request->validate([
            'stars' => ['required', 'integer', 'min:1', 'max:5'],
            'review' => ['nullable', 'string', 'max:3000'],
        ]);

        $check = $this->isVerifiedVisitor($user->user_id, $gymId);
        if (!$check['verified']) {
            return response()->json(['message' => 'Rate after verified visit'], 403);
        }

        $rating = GymRating::where('gym_id', $gymId)
            ->where('user_id', $user->user_id)
            ->first();

        if ($rating) {
            $rating->update([
                'stars' => (int)$request->input('stars'),
                'review' => $request->input('review'),
                'verified_via' => $check['via'],
                'verified_ref_id' => $check['ref_id'],
            ]);

            return response()->json([
                'message' => 'Rating updated',
                'rating' => $rating->fresh(),
            ]);
        }

        $rating = GymRating::create([
            'gym_id' => $gymId,
            'user_id' => $user->user_id,
            'stars' => (int)$request->input('stars'),
            'review' => $request->input('review'),
            'verified_via' => $check['via'],
            'verified_ref_id' => $check['ref_id'],
        ]);

        return response()->json([
            'message' => 'Rating created',
            'rating' => $rating,
        ], 201);
    }

    public function myRatings(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $rows = GymRating::with(['gym'])
            ->where('user_id', $user->user_id)
            ->orderByDesc('updated_at')
            ->paginate((int)($request->query('per_page', 20)));

        return response()->json($rows);
    }

    public function gymRatings(Request $request, $gymId)
    {
        $gym = Gym::where('gym_id', $gymId)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        $rows = GymRating::with(['user'])
            ->where('gym_id', $gymId)
            ->orderByDesc('created_at')
            ->paginate((int)($request->query('per_page', 20)));

        $avg = GymRating::where('gym_id', $gymId)->avg('stars');
        $count = GymRating::where('gym_id', $gymId)->count();

        return response()->json([
            'summary' => [
                'avg_stars' => $avg ? round((float)$avg, 2) : null,
                'count' => (int)$count,
            ],
            'ratings' => $rows,
        ]);
    }

    public function canRate(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $gym = Gym::where('gym_id', $gymId)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        $check = $this->isVerifiedVisitor($user->user_id, $gymId);

        return response()->json([
            'can_rate' => (bool)$check['verified'],
            'verified_via' => $check['via'],
            'verified_ref_id' => $check['ref_id'],
        ]);
    }
}