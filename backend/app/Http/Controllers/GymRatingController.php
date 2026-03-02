<?php

namespace App\Http\Controllers;

use App\Models\Gym;
use App\Models\GymFreeVisit;
use App\Models\GymMembership;
use App\Models\GymRating;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\NotificationService;

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

        // ✅ OWNER NOTIF: New review posted
        // (send on create OR update; if you only want create, wrap with if ($rating->wasRecentlyCreated) { ... })
        if (!empty($gym->owner_id)) {
            NotificationService::create([
                'recipient_id' => (int) $gym->owner_id,
                'recipient_role' => 'owner',
                'type' => 'REVIEW_POSTED',
                'title' => 'New review posted',
                'message' => ($user->name ?? 'A user') . ' left a ' . (int) $rating->stars . '-star review for "' . ($gym->name ?? 'your gym') . '".',
                'gym_id' => (int) $gym->gym_id,
                'actor_id' => (int) $user->user_id,
                'url' => '/owner/gyms/' . (int) $gym->gym_id . '/ratings',
                'meta' => [
                    'rating_id' => (int) ($rating->rating_id ?? 0),
                    'verified' => (bool) ($rating->verified ?? false),
                ],
            ]);
        }

        return response()->json([
            'message' => $rating->wasRecentlyCreated ? 'Rating created' : 'Rating updated',
            'rating' => $rating->fresh(),
        ], $rating->wasRecentlyCreated ? 201 : 200);
    }

    public function myRatings(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $perPage = max(1, min((int) ($request->query('per_page', 20)), 100));

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

        $perPage = max(1, min((int) ($request->query('per_page', 20)), 100));

        $rows = GymRating::with(['user'])
            ->where('gym_id', $gymId)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $verifiedAvg = GymRating::where('gym_id', $gymId)->where('verified', true)->avg('stars');
        $verifiedCount = GymRating::where('gym_id', $gymId)->where('verified', true)->count();
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

    public function ownerGymRatings(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        if (!in_array($user->role, ['owner', 'admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $gymId = (int) $gymId;

        // ✅ owner can only view own gym (admins can view any)
        $gymQ = Gym::where('gym_id', $gymId);
        if ($user->role === 'owner') $gymQ->where('owner_id', (int) $user->user_id);

        $gym = $gymQ->first();
        if (!$gym) return response()->json(['message' => 'Gym not found or not accessible'], 404);

        $perPage = max(1, min((int) ($request->query('per_page', 20)), 100));

        $verified = $request->query('verified', null); // "1" | "0" | null
        $stars    = $request->query('stars', null);    // 1..5 or null
        $q        = trim((string) $request->query('q', ''));
        $sort     = (string) $request->query('sort', 'newest'); // newest|oldest|highest|lowest

        $query = GymRating::query()
            ->where('gym_id', $gymId)
            ->with(['user' => function ($u) {
                $u->select('user_id', 'name', 'email', 'avatar');
            }]);

        if ($verified !== null && ($verified === "0" || $verified === "1")) {
            $query->where('verified', $verified === "1");
        }

        if ($stars !== null && is_numeric($stars)) {
            $s = (int) $stars;
            if ($s >= 1 && $s <= 5) $query->where('stars', $s);
        }

        if ($q !== '') {
            $query->where(function ($w) use ($q) {
                $w->where('review', 'like', "%{$q}%")
                    ->orWhereHas('user', function ($u) use ($q) {
                        $u->where('name', 'like', "%{$q}%")
                            ->orWhere('email', 'like', "%{$q}%");
                    });
            });
        }

        switch ($sort) {
            case 'oldest':
                $query->orderBy('created_at', 'asc');
                break;
            case 'highest':
                $query->orderBy('stars', 'desc')->orderBy('created_at', 'desc');
                break;
            case 'lowest':
                $query->orderBy('stars', 'asc')->orderBy('created_at', 'desc');
                break;
            case 'newest':
            default:
                $query->orderBy('created_at', 'desc');
                break;
        }

        $rows = $query->paginate($perPage);

        $verifiedAvg = GymRating::where('gym_id', $gymId)->where('verified', true)->avg('stars');
        $verifiedCount = GymRating::where('gym_id', $gymId)->where('verified', true)->count();
        $totalCount = GymRating::where('gym_id', $gymId)->count();
        $unverifiedCount = $totalCount - $verifiedCount;

        return response()->json([
            'summary' => [
                'public_avg_stars' => $verifiedAvg ? round((float) $verifiedAvg, 2) : null,
                'verified_count' => (int) $verifiedCount,
                'unverified_count' => (int) $unverifiedCount,
                'total_count' => (int) $totalCount,
                'note' => 'Public rating score uses verified reviews only.',
            ],
            'ratings' => $rows,
        ]);
    }

    public function latest(Request $request)
    {
        $limit = max(1, min((int) $request->query('limit', 3), 10));

        $rows = GymRating::query()
            ->with([
                'user:user_id,name,email',
                'gym:gym_id,name'
            ])
            ->whereNotNull('review')
            ->where('review', '<>', '')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        return response()->json(['data' => $rows]);
    }
}