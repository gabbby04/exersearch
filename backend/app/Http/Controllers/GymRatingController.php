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
    private function verificationCheck(int $userId, int $gymId): array
    {
        $usedFreeVisit = GymFreeVisit::where('gym_id', $gymId)
            ->where('user_id', $userId)
            ->where('status', 'used')
            ->whereNotNull('used_at')
            ->orderByDesc('used_at')
            ->first();

        if ($usedFreeVisit) {
            return [
                'verified' => true,
                'via' => 'free_visit_used',
                'ref_id' => (int) $usedFreeVisit->free_visit_id,
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
                'ref_id' => (int) $membership->membership_id,
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

        $gymId = (int) $gymId;

        $gym = Gym::where('gym_id', $gymId)->where('status', 'approved')->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        $request->validate([
            'stars'  => ['required', 'integer', 'min:1', 'max:5'],
            'review' => ['nullable', 'string', 'max:3000'],
        ]);

        $check = $this->verificationCheck((int) $user->user_id, $gymId);

        $payload = [
            'stars' => (int) $request->input('stars'),
            'review' => $request->input('review'),
            'verified' => (bool) $check['verified'],
            'verified_via' => $check['verified'] ? $check['via'] : null,
            'verified_ref_id' => $check['verified'] ? $check['ref_id'] : null,
        ];

        $rating = GymRating::updateOrCreate(
            ['gym_id' => $gymId, 'user_id' => (int) $user->user_id],
            $payload
        );

        return response()->json([
            'message' => $rating->wasRecentlyCreated ? 'Rating created' : 'Rating updated',
            'rating' => $rating->fresh(),
        ], $rating->wasRecentlyCreated ? 201 : 200);
    }

    public function myRatings(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $perPage = (int) ($request->query('per_page', 20));

        $rows = GymRating::with(['gym'])
            ->where('user_id', $user->user_id)
            ->orderByDesc('updated_at')
            ->paginate($perPage);

        return response()->json($rows);
    }

    public function gymRatings(Request $request, $gymId)
    {
        $gymId = (int) $gymId;

        $gym = Gym::where('gym_id', $gymId)->where('status', 'approved')->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        $perPage = (int) ($request->query('per_page', 20));

        $rows = GymRating::with(['user'])
            ->where('gym_id', $gymId)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $verifiedAvg = GymRating::where('gym_id', $gymId)
            ->where('verified', true)
            ->avg('stars');

        $verifiedCount = GymRating::where('gym_id', $gymId)
            ->where('verified', true)
            ->count();

        $totalCount = GymRating::where('gym_id', $gymId)->count();
        $unverifiedCount = $totalCount - $verifiedCount;

        return response()->json([
            'summary' => [
                'public_avg_stars' => $verifiedAvg ? round((float) $verifiedAvg, 2) : null,
                'verified_count' => (int) $verifiedCount,
                'unverified_count' => (int) $unverifiedCount,
                'total_count' => (int) $totalCount,
            ],
            'ratings' => $rows,
        ]);
    }

    public function canRate(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $gymId = (int) $gymId;

        $gym = Gym::where('gym_id', $gymId)->where('status', 'approved')->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        $check = $this->verificationCheck((int) $user->user_id, $gymId);

        return response()->json([
            'is_verified_visitor' => (bool) $check['verified'],
            'verified_via' => $check['via'],
            'verified_ref_id' => $check['ref_id'],
        ]);
    }
}