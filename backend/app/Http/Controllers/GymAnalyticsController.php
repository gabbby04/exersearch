<?php

namespace App\Http\Controllers;

use App\Models\Gym;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GymAnalyticsController extends Controller
{
    private function rangeToDays(string $range): int
    {
        return match ($range) {
            '7d'  => 7,
            '30d' => 30,
            '90d' => 90,
            '1y'  => 365,
            default => 30,
        };
    }

    private function pctChange(int $current, int $previous): int
    {
        if ($previous > 0) {
            return (int) round((($current - $previous) / $previous) * 100);
        }
        return $current > 0 ? 100 : 0;
    }

    private function isAdmin($user): bool
    {
        return in_array($user->role ?? '', ['admin', 'superadmin'], true);
    }

    /**
     * Returns "market" gym ids:
     * - if the gym has lat/lng: gyms within 8km (approved + has coords)
     * - if fewer than 2 results, fall back to all approved gyms
     *
     * ✅ FIXED: clamps acos input to [-1, 1] for Postgres so it never errors
     */
    private function marketGymIds(Gym $gym)
    {
        $lat = $gym->latitude;
        $lng = $gym->longitude;

        if ($lat !== null && $lng !== null) {
            $lat = (float) $lat;
            $lng = (float) $lng;
            $radiusKm = 8;

            // Postgres-safe: clamp value inside acos to [-1, 1]
            $inner = "
                cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) +
                sin(radians(?)) * sin(radians(latitude))
            ";

            $distance = "
                6371 * acos(
                    LEAST(1, GREATEST(-1, ($inner)))
                )
            ";

            $ids = DB::table('gyms')
                ->where('status', 'approved')
                ->whereNotNull('latitude')
                ->whereNotNull('longitude')
                ->whereRaw("$distance <= ?", [$lat, $lng, $lat, $radiusKm])
                ->pluck('gym_id');

            if ($ids->count() >= 2) return $ids;
        }

        return DB::table('gyms')
            ->where('status', 'approved')
            ->pluck('gym_id');
    }

    private function memberDemographics(int $gymId): array
    {
        $activeMemberIds = DB::table('gym_memberships')
            ->where('gym_id', (int) $gymId)
            ->where('status', 'active')
            ->distinct()
            ->pluck('user_id');

        $activeMemberCount = (int) $activeMemberIds->count();
        if ($activeMemberCount <= 0) {
            return [
                'sample_size' => 0,
                'age' => [],
                'gender' => ['male' => 0, 'female' => 0, 'other' => 0],
            ];
        }

        $ageAgg = DB::table('user_profiles as up')
            ->whereIn('up.user_id', $activeMemberIds)
            ->selectRaw('COUNT(up.user_id) as total_with_age')
            ->selectRaw("SUM(CASE WHEN up.age BETWEEN 12 AND 18 THEN 1 ELSE 0 END) as a_12_18")
            ->selectRaw("SUM(CASE WHEN up.age BETWEEN 19 AND 24 THEN 1 ELSE 0 END) as a_19_24")
            ->selectRaw("SUM(CASE WHEN up.age BETWEEN 25 AND 34 THEN 1 ELSE 0 END) as a_25_34")
            ->selectRaw("SUM(CASE WHEN up.age BETWEEN 35 AND 44 THEN 1 ELSE 0 END) as a_35_44")
            ->selectRaw("SUM(CASE WHEN up.age BETWEEN 45 AND 54 THEN 1 ELSE 0 END) as a_45_54")
            ->selectRaw("SUM(CASE WHEN up.age >= 55 THEN 1 ELSE 0 END) as a_55_plus")
            ->whereNotNull('up.age')
            ->first();

        $ageTotal = (int) ($ageAgg->total_with_age ?? 0);
        $ageTotal = max($ageTotal, 0);

        $ageBuckets = [
            ['range' => '12-18', 'count' => (int) ($ageAgg->a_12_18 ?? 0)],
            ['range' => '19-24', 'count' => (int) ($ageAgg->a_19_24 ?? 0)],
            ['range' => '25-34', 'count' => (int) ($ageAgg->a_25_34 ?? 0)],
            ['range' => '35-44', 'count' => (int) ($ageAgg->a_35_44 ?? 0)],
            ['range' => '45-54', 'count' => (int) ($ageAgg->a_45_54 ?? 0)],
            ['range' => '55+', 'count' => (int) ($ageAgg->a_55_plus ?? 0)],
        ];

        $ageOut = array_map(function ($b) use ($ageTotal) {
            $pct = $ageTotal > 0 ? (int) round(($b['count'] / $ageTotal) * 100) : 0;
            return [
                'range' => $b['range'],
                'count' => (int) $b['count'],
                'percentage' => (int) $pct,
            ];
        }, $ageBuckets);

        $genderAgg = DB::table('user_profiles as up')
            ->whereIn('up.user_id', $activeMemberIds)
            ->selectRaw('COUNT(up.user_id) as total_with_gender')
            ->selectRaw("SUM(CASE WHEN LOWER(COALESCE(up.gender,'')) IN ('male','m') THEN 1 ELSE 0 END) as male")
            ->selectRaw("SUM(CASE WHEN LOWER(COALESCE(up.gender,'')) IN ('female','f') THEN 1 ELSE 0 END) as female")
            ->selectRaw("SUM(CASE WHEN up.gender IS NULL OR TRIM(up.gender) = '' OR LOWER(COALESCE(up.gender,'')) NOT IN ('male','m','female','f') THEN 1 ELSE 0 END) as other")
            ->first();

        return [
            'sample_size' => $activeMemberCount,
            'age' => $ageOut,
            'gender' => [
                'male' => (int) ($genderAgg->male ?? 0),
                'female' => (int) ($genderAgg->female ?? 0),
                'other' => (int) ($genderAgg->other ?? 0),
            ],
            'coverage' => [
                'age_profiles' => (int) ($ageTotal ?? 0),
                'gender_profiles' => (int) ($genderAgg->total_with_gender ?? 0),
            ],
        ];
    }

    public function show(Request $request, $gymId)
    {
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated.'], 401);

        $gym = Gym::findOrFail((int) $gymId);

        $ownerId = $gym->owner_id ?? null;
        $isAdmin = $this->isAdmin($user);

        if (!$isAdmin && $ownerId !== null && (int) $ownerId !== (int) $user->user_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $range = (string) $request->query('range', '30d');
        $days = $this->rangeToDays($range);

        $end = now();
        $start = now()->copy()->subDays($days);

        $prevEnd = $start;
        $prevStart = $start->copy()->subDays($days);

        $viewsCurrent = (int) DB::table('gym_interactions')
            ->where('gym_id', (int) $gymId)
            ->where('event', 'view')
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $viewsPrevious = (int) DB::table('gym_interactions')
            ->where('gym_id', (int) $gymId)
            ->where('event', 'view')
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->count();

        $totalViews = (int) DB::table('gym_interactions')
            ->where('gym_id', (int) $gymId)
            ->where('event', 'view')
            ->count();

        $savesCurrent = (int) DB::table('saved_gyms')
            ->where('gym_id', (int) $gymId)
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $savesPrevious = (int) DB::table('saved_gyms')
            ->where('gym_id', (int) $gymId)
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->count();

        $totalSaves = (int) DB::table('saved_gyms')
            ->where('gym_id', (int) $gymId)
            ->count();

        $inquiriesCurrent = (int) DB::table('gym_inquiries')
            ->where('gym_id', (int) $gymId)
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $inquiriesPrevious = (int) DB::table('gym_inquiries')
            ->where('gym_id', (int) $gymId)
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->count();

        $totalInquiries = (int) DB::table('gym_inquiries')
            ->where('gym_id', (int) $gymId)
            ->count();

        $inquiriesResolvedCurrent = (int) DB::table('gym_inquiries')
            ->where('gym_id', (int) $gymId)
            ->whereIn('status', ['answered', 'closed'])
            ->whereBetween('updated_at', [$start, $end])
            ->count();

        $membershipIntentsCurrent = (int) DB::table('gym_memberships')
            ->where('gym_id', (int) $gymId)
            ->where('status', 'intent')
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $membershipIntentsPrevious = (int) DB::table('gym_memberships')
            ->where('gym_id', (int) $gymId)
            ->where('status', 'intent')
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->count();

        $activeMembersNow = (int) DB::table('gym_memberships')
            ->where('gym_id', (int) $gymId)
            ->where('status', 'active')
            ->count();

        $activeMembersPrevious = (int) DB::table('gym_memberships')
            ->where('gym_id', (int) $gymId)
            ->where('status', 'active')
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->count();

        $freeVisitsClaimedCurrent = (int) DB::table('gym_free_visits')
            ->where('gym_id', (int) $gymId)
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $freeVisitsClaimedPrevious = (int) DB::table('gym_free_visits')
            ->where('gym_id', (int) $gymId)
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->count();

        $freeVisitsUsedCurrent = (int) DB::table('gym_free_visits')
            ->where('gym_id', (int) $gymId)
            ->where('status', 'used')
            ->whereBetween('updated_at', [$start, $end])
            ->count();

        $monthStart = now()->startOfMonth();
        $monthlySignupsCurrent = (int) DB::table('gym_memberships')
            ->where('gym_id', (int) $gymId)
            ->where('status', 'active')
            ->where('created_at', '>=', $monthStart)
            ->count();

        $verifiedRatingAvg = (float) DB::table('gym_ratings')
            ->where('gym_id', (int) $gymId)
            ->where('verified', true)
            ->avg('stars');

        $verifiedRatingCount = (int) DB::table('gym_ratings')
            ->where('gym_id', (int) $gymId)
            ->where('verified', true)
            ->count();

        $marketIds = $this->marketGymIds($gym)->filter()->values();
        $marketCount = (int) $marketIds->count();

        $areaAvgRating = (float) DB::table('gym_ratings')
            ->whereIn('gym_id', $marketIds)
            ->where('verified', true)
            ->avg('stars');

        $areaAvgMembers = (float) DB::table('gym_memberships')
            ->selectRaw('AVG(cnt) as avg_cnt')
            ->fromSub(
                DB::table('gym_memberships')
                    ->selectRaw('gym_id, COUNT(*) as cnt')
                    ->whereIn('gym_id', $marketIds)
                    ->where('status', 'active')
                    ->groupBy('gym_id'),
                't'
            )
            ->value('avg_cnt');

        $areaAvgPrice = (float) DB::table('gyms')
            ->whereIn('gym_id', $marketIds)
            ->where('status', 'approved')
            ->avg('monthly_price');

        $ratingsAgg = DB::table('gym_ratings')
            ->selectRaw('gym_id, AVG(stars) as verified_avg')
            ->where('verified', true)
            ->groupBy('gym_id');

        $membersAgg = DB::table('gym_memberships')
            ->selectRaw('gym_id, COUNT(*) as active_members')
            ->where('status', 'active')
            ->groupBy('gym_id');

        $topComp = DB::table('gyms as g')
            ->whereIn('g.gym_id', $marketIds)
            ->where('g.status', 'approved')
            ->leftJoinSub($ratingsAgg, 'ra', function ($j) {
                $j->on('ra.gym_id', '=', 'g.gym_id');
            })
            ->leftJoinSub($membersAgg, 'ma', function ($j) {
                $j->on('ma.gym_id', '=', 'g.gym_id');
            })
            ->whereNotNull('ra.verified_avg')
            ->selectRaw('g.gym_id, g.name')
            ->selectRaw('COALESCE(ra.verified_avg, 0) as verified_avg')
            ->selectRaw('COALESCE(ma.active_members, 0) as active_members')
            ->selectRaw('COALESCE(g.monthly_price, 0) as price')
            ->orderByDesc('verified_avg')
            ->orderByDesc('active_members')
            ->orderBy('price')
            ->limit(1)
            ->first();

        $hasMarketData = $marketCount >= 2 && $topComp !== null;

        $timeline = [];
        if ($request->boolean('timeline', true)) {
            $timeline = DB::select("
                SELECT
                  d::date AS day,
                  COALESCE(v.views, 0) AS views,
                  COALESCE(s.saves, 0) AS saves,
                  COALESCE(i.inquiries, 0) AS inquiries,
                  COALESCE(mi.intents, 0) AS membership_intents,
                  COALESCE(fv.claimed, 0) AS free_visits_claimed
                FROM generate_series(?::date, ?::date, interval '1 day') d
                LEFT JOIN (
                  SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS views
                  FROM gym_interactions
                  WHERE gym_id = ? AND event = 'view' AND created_at BETWEEN ? AND ?
                  GROUP BY 1
                ) v ON v.day = d::date
                LEFT JOIN (
                  SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS saves
                  FROM saved_gyms
                  WHERE gym_id = ? AND created_at BETWEEN ? AND ?
                  GROUP BY 1
                ) s ON s.day = d::date
                LEFT JOIN (
                  SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS inquiries
                  FROM gym_inquiries
                  WHERE gym_id = ? AND created_at BETWEEN ? AND ?
                  GROUP BY 1
                ) i ON i.day = d::date
                LEFT JOIN (
                  SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS intents
                  FROM gym_memberships
                  WHERE gym_id = ? AND status = 'intent' AND created_at BETWEEN ? AND ?
                  GROUP BY 1
                ) mi ON mi.day = d::date
                LEFT JOIN (
                  SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS claimed
                  FROM gym_free_visits
                  WHERE gym_id = ? AND created_at BETWEEN ? AND ?
                  GROUP BY 1
                ) fv ON fv.day = d::date
                ORDER BY d ASC
            ", [
                $start->toDateString(), $end->toDateString(),
                (int) $gymId, $start, $end,
                (int) $gymId, $start, $end,
                (int) $gymId, $start, $end,
                (int) $gymId, $start, $end,
                (int) $gymId, $start, $end,
            ]);
        }

        $demographics = $this->memberDemographics((int) $gymId);

        return response()->json([
            'gym' => [
                'gym_id' => (int) $gym->gym_id,
                'name' => $gym->name,
                'monthly_price' => (float) ($gym->monthly_price ?? 0),
            ],
            'range' => $range,
            'window' => [
                'start' => $start->toISOString(),
                'end' => $end->toISOString(),
                'prev_start' => $prevStart->toISOString(),
                'prev_end' => $prevEnd->toISOString(),
            ],
            'totals' => [
                'views' => [
                    'total' => $totalViews,
                    'current' => $viewsCurrent,
                    'previous' => $viewsPrevious,
                    'change' => $this->pctChange($viewsCurrent, $viewsPrevious),
                ],
                'saves' => [
                    'total' => $totalSaves,
                    'current' => $savesCurrent,
                    'previous' => $savesPrevious,
                    'change' => $this->pctChange($savesCurrent, $savesPrevious),
                ],
                'inquiries' => [
                    'total' => $totalInquiries,
                    'current' => $inquiriesCurrent,
                    'previous' => $inquiriesPrevious,
                    'resolved_current' => $inquiriesResolvedCurrent,
                    'change' => $this->pctChange($inquiriesCurrent, $inquiriesPrevious),
                ],
                'membership_intents' => [
                    'current' => $membershipIntentsCurrent,
                    'previous' => $membershipIntentsPrevious,
                    'change' => $this->pctChange($membershipIntentsCurrent, $membershipIntentsPrevious),
                ],
                'active_members' => [
                    'current' => $activeMembersNow,
                    'previous' => $activeMembersPrevious,
                    'change' => $this->pctChange($activeMembersNow, $activeMembersPrevious),
                ],
                'monthly_signups' => [
                    'current' => $monthlySignupsCurrent,
                ],
                'free_visits' => [
                    'claimed_current' => $freeVisitsClaimedCurrent,
                    'claimed_previous' => $freeVisitsClaimedPrevious,
                    'claimed_change' => $this->pctChange($freeVisitsClaimedCurrent, $freeVisitsClaimedPrevious),
                    'used_current' => $freeVisitsUsedCurrent,
                ],
                'ratings' => [
                    'verified_avg' => $verifiedRatingCount > 0 ? round($verifiedRatingAvg, 2) : null,
                    'verified_count' => $verifiedRatingCount,
                ],
            ],
            'demographics' => $demographics,
            'competitor_comparison' => [
                'has_market_data' => $hasMarketData,
                'market_count' => $marketCount,
                'your_gym' => [
                    'rating' => $verifiedRatingCount > 0 ? round($verifiedRatingAvg, 1) : 0,
                    'members' => $activeMembersNow,
                    'price' => (int) round((float) ($gym->monthly_price ?? 0)),
                ],
                'area_average' => [
                    'rating' => round((float) $areaAvgRating, 1),
                    'members' => (int) round((float) $areaAvgMembers),
                    'price' => (int) round((float) $areaAvgPrice),
                ],
                'top_competitor' => $topComp ? [
                    'gym_id' => (int) $topComp->gym_id,
                    'name' => (string) $topComp->name,
                    'rating' => round((float) $topComp->verified_avg, 1),
                    'members' => (int) $topComp->active_members,
                    'price' => (int) round((float) $topComp->price),
                ] : null,
            ],
            'timeline' => array_map(function ($r) {
                return [
                    'date' => (string) $r->day,
                    'views' => (int) $r->views,
                    'saves' => (int) $r->saves,
                    'inquiries' => (int) $r->inquiries,
                    'membership_intents' => (int) $r->membership_intents,
                    'free_visits_claimed' => (int) $r->free_visits_claimed,
                ];
            }, $timeline),
        ]);
    }

    public function activities(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated.'], 401);

        $isAdmin = $this->isAdmin($user);

        $rows = DB::table('gym_interactions as gi')
            ->join('gyms as g', 'g.gym_id', '=', 'gi.gym_id')
            ->when(!$isAdmin, function ($q) use ($user) {
                return $q->where('g.owner_id', (int) $user->user_id);
            })
            ->whereIn('gi.event', ['view', 'click', 'save'])
            ->orderByDesc('gi.created_at')
            ->limit(20)
            ->get([
                'gi.gym_id',
                'g.name as gym_name',
                'gi.event',
                'gi.created_at',
            ])
            ->values()
            ->map(function ($row, $i) {
                $row->id = $i + 1;
                return $row;
            });

        return response()->json(['data' => $rows]);
    }
}