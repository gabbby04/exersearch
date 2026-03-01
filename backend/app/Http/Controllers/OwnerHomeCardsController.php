<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

use App\Models\Gym;
use App\Models\User;
use App\Models\GymInquiry;
use App\Models\GymRating;
use App\Models\GymMembership;

class OwnerHomeCardsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $role = strtolower((string)($user->role ?? ''));
        $isSuper = $role === 'superadmin';
        $isOwner = $role === 'owner';

        if (!$isOwner && !$isSuper) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // renewals within N days (default 3)
        $days = (int)($request->query('days', 3));
        if ($days < 1) $days = 3;
        if ($days > 30) $days = 30;

        $today = Carbon::today();
        $until = $today->copy()->addDays($days);

        // gyms scope: owner => only owned gyms; superadmin => all gyms
        $gymsQ = Gym::query()->select('gym_id', 'name', 'owner_id');
        if (!$isSuper) {
            $gymsQ->where('owner_id', $user->user_id);
        }
        $gyms = $gymsQ->get();
        $gymIds = $gyms->pluck('gym_id')->values();

        if ($gymIds->count() === 0) {
            return response()->json([
                'latest_inquiries' => [],
                'latest_reviews' => [],
                'upcoming_renewals' => [],
                'recent_signups' => [],
                'meta' => [
                    'days' => $days,
                    'scope' => $isSuper ? 'all' : 'owned',
                ],
            ]);
        }

        $gymsMap = $gyms->keyBy('gym_id');

        // ---------------------------
        // Latest inquiries (5)
        // Owner involved = inquiries for their gyms (or all if superadmin)
        // ---------------------------
        $latestInquiries = GymInquiry::query()
            ->whereIn('gym_id', $gymIds)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get([
                'inquiry_id',
                'gym_id',
                'user_id',
                'status',
                'question',
                'answer',
                'answered_at',
                'answered_by_owner_id',
                'owner_read_at',
                'created_at',
            ]);

        $inqUserIds = $latestInquiries->pluck('user_id')->unique()->values();

        $inqUsersMap = User::query()
            ->whereIn('user_id', $inqUserIds)
            ->get(['user_id', 'name', 'email'])
            ->keyBy('user_id');

        $latestInquiriesOut = $latestInquiries->map(function ($r) use ($gymsMap, $inqUsersMap) {
            $gym = $gymsMap->get($r->gym_id);
            $u = $inqUsersMap->get($r->user_id);

            return [
                'inquiry_id' => $r->inquiry_id,
                'gym_id' => $r->gym_id,
                'gym_name' => $gym?->name ?? 'Gym',
                'from_user_id' => $r->user_id,
                'from_name' => $u?->name ?? 'Member',
                'from_email' => $u?->email ?? null,
                'status' => $r->status ?? 'open',
                'question' => $r->question ?? '',
                'answer' => $r->answer ?? null,
                'answered_at' => $r->answered_at,
                'answered_by_owner_id' => $r->answered_by_owner_id,
                'owner_read_at' => $r->owner_read_at,
                'created_at' => $r->created_at,
            ];
        })->values();

        // ---------------------------
        // Latest reviews (5)
        // ---------------------------
        $latestReviews = GymRating::query()
            ->whereIn('gym_id', $gymIds)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get([
                'rating_id',
                'gym_id',
                'user_id',
                'stars',
                'review',
                'verified',
                'created_at',
            ]);

        $revUserIds = $latestReviews->pluck('user_id')->unique()->values();

        $revUsersMap = User::query()
            ->whereIn('user_id', $revUserIds)
            ->get(['user_id', 'name'])
            ->keyBy('user_id');

        $latestReviewsOut = $latestReviews->map(function ($r) use ($gymsMap, $revUsersMap) {
            $gym = $gymsMap->get($r->gym_id);
            $u = $revUsersMap->get($r->user_id);

            return [
                'rating_id' => $r->rating_id,
                'gym_id' => $r->gym_id,
                'gym_name' => $gym?->name ?? 'Gym',
                'user_id' => $r->user_id,
                'user_name' => $u?->name ?? 'User',
                'stars' => (int)($r->stars ?? 0),
                'review' => $r->review ?? '',
                'verified' => (bool)($r->verified ?? false),
                'created_at' => $r->created_at,
            ];
        })->values();

        // ---------------------------
        // Recent signups (5)
        // "recently added members" => latest memberships created
        // ---------------------------
        $recentSignups = GymMembership::query()
            ->whereIn('gym_id', $gymIds)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get([
                'membership_id',
                'gym_id',
                'user_id',
                'status',
                'plan_type',
                'start_date',
                'end_date',
                'created_at',
            ]);

        $msUserIds = $recentSignups->pluck('user_id')->unique()->values();

        $msUsersMap = User::query()
            ->whereIn('user_id', $msUserIds)
            ->get(['user_id', 'name', 'email'])
            ->keyBy('user_id');

        $recentSignupsOut = $recentSignups->map(function ($m) use ($gymsMap, $msUsersMap) {
            $gym = $gymsMap->get($m->gym_id);
            $u = $msUsersMap->get($m->user_id);

            return [
                'membership_id' => $m->membership_id,
                'gym_id' => $m->gym_id,
                'gym_name' => $gym?->name ?? 'Gym',
                'user_id' => $m->user_id,
                'user_name' => $u?->name ?? 'Member',
                'user_email' => $u?->email ?? null,
                'status' => $m->status ?? null,
                'plan_type' => $m->plan_type ?? null,
                'start_date' => $m->start_date,
                'end_date' => $m->end_date,
                'created_at' => $m->created_at,
            ];
        })->values();

        // ---------------------------
        // Upcoming renewals (expiring within N days)
        // uses end_date (date)
        // ---------------------------
        $upcomingRenewals = GymMembership::query()
            ->whereIn('gym_id', $gymIds)
            ->whereNotNull('end_date')
            ->whereDate('end_date', '>=', $today)
            ->whereDate('end_date', '<=', $until)
            ->orderBy('end_date', 'asc')
            ->limit(5)
            ->get([
                'membership_id',
                'gym_id',
                'user_id',
                'status',
                'plan_type',
                'end_date',
            ]);

        $urUserIds = $upcomingRenewals->pluck('user_id')->unique()->values();

        $urUsersMap = User::query()
            ->whereIn('user_id', $urUserIds)
            ->get(['user_id', 'name', 'email'])
            ->keyBy('user_id');

        $upcomingRenewalsOut = $upcomingRenewals->map(function ($m) use ($gymsMap, $urUsersMap, $today) {
            $gym = $gymsMap->get($m->gym_id);
            $u = $urUsersMap->get($m->user_id);

            $end = $m->end_date ? Carbon::parse($m->end_date)->startOfDay() : null;
            $daysLeft = $end ? $today->diffInDays($end, false) : null;
            if ($daysLeft != null && $daysLeft < 0) $daysLeft = 0;

            return [
                'membership_id' => $m->membership_id,
                'gym_id' => $m->gym_id,
                'gym_name' => $gym?->name ?? 'Gym',
                'user_id' => $m->user_id,
                'user_name' => $u?->name ?? 'Member',
                'user_email' => $u?->email ?? null,
                'status' => $m->status ?? null,
                'plan_type' => $m->plan_type ?? null,
                'end_date' => $m->end_date,
                'days_left' => $daysLeft,
            ];
        })->values();

        return response()->json([
            'latest_inquiries' => $latestInquiriesOut,
            'latest_reviews' => $latestReviewsOut,
            'upcoming_renewals' => $upcomingRenewalsOut,
            'recent_signups' => $recentSignupsOut,
            'meta' => [
                'days' => $days,
                'scope' => $isSuper ? 'all' : 'owned',
            ],
        ]);
    }
}