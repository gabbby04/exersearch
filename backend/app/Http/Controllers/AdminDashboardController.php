<?php

namespace App\Http\Controllers;

use App\Models\Gym;
use App\Models\User;
use App\Models\GymAnnouncement;
use App\Models\GymOwnerApplication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function show(Request $request)
    {
        $range = (string) $request->query('range', '30d');

        if (!in_array($range, ['7d', '30d', '12m'], true)) {
            $range = '30d';
        }

        $days = $range === '7d' ? 7 : ($range === '30d' ? 30 : 365);
        $from = now()->subDays($days);

        /* ---------------- KPI ---------------- */

        $pendingApplications = GymOwnerApplication::where('status', 'pending')->count();

        $pendingGyms = Gym::where('status', 'pending')->count();

        $totalGyms = Gym::count();

        $totalUsers = User::where('role', 'user')->count();

        $blockedGyms = Gym::where('is_announcement_blocked', true)->count();

        $interactions = DB::table('gym_interactions')
            ->where('created_at', '>=', $from)
            ->count();

        /* ---------------- RECENT ACTIVITY ---------------- */

        $apps = GymOwnerApplication::latest()
            ->limit(6)
            ->get()
            ->map(function ($a) {
                return [
                    'type' => 'owner_application',
                    'id' => $a->id,
                    'title' => 'New gym owner application',
                    'subtitle' => ($a->gym_name ?? 'Gym') . ' • ' . ($a->address ?? ''),
                    'created_at' => optional($a->created_at)->toIso8601String(),
                ];
            });

        $gyms = Gym::latest('gym_id')
            ->limit(6)
            ->get()
            ->map(function ($g) {
                return [
                    'type' => 'gym',
                    'id' => $g->gym_id,
                    'title' => 'Gym update',
                    'subtitle' => ($g->name ?? 'Gym') . ' • ' . ($g->address ?? ''),
                    'created_at' => optional($g->created_at)->toIso8601String(),
                ];
            });

        $announcements = GymAnnouncement::latest('announcement_id')
            ->limit(6)
            ->get()
            ->map(function ($x) {
                return [
                    'type' => 'announcement',
                    'id' => $x->announcement_id,
                    'title' => $x->is_deleted ? 'Announcement deleted' : 'New announcement',
                    'subtitle' => $x->title ?? '',
                    'created_at' => optional($x->created_at)->toIso8601String(),
                ];
            });

        $activity = $apps
            ->concat($gyms)
            ->concat($announcements)
            ->sortByDesc('created_at')
            ->values()
            ->take(12);

        /* ---------------- CHARTS ---------------- */

        $approvalsByMonth = $this->countByMonth(
            GymOwnerApplication::where('status', 'approved'),
            'created_at',
            12
        );

        $interactionsTrend = $this->countByDayTrend(
            'gym_interactions',
            'created_at',
            $days
        );

        return response()->json([
            'range' => $range,
            'kpi' => [
                'pending_applications' => $pendingApplications,
                'pending_gyms' => $pendingGyms,
                'total_gyms' => $totalGyms,
                'total_users' => $totalUsers,
                'blocked_gyms' => $blockedGyms,
                'interactions' => $interactions,
            ],
            'charts' => [
                'approvals_by_month' => $approvalsByMonth,
                'interactions_trend' => $interactionsTrend,
            ],
            'activity' => $activity,
        ]);
    }

    /* ---------------- MONTHLY CHART ---------------- */

    private function countByMonth($query, string $column, int $months)
    {
        $start = now()->startOfMonth()->subMonths($months - 1);

        $rows = $query
            ->where($column, '>=', $start)
            ->selectRaw("date_trunc('month', $column) as ym, COUNT(*) as c")
            ->groupBy('ym')
            ->orderBy('ym')
            ->get();

        $map = $rows->pluck('c', 'ym')->toArray();

        $out = [];

        for ($i = 0; $i < $months; $i++) {
            $date = (clone $start)->addMonths($i);

            $key = $date->startOfMonth()->toDateTimeString();

            $out[] = [
                'label' => $date->format('M'),
                'value' => (int) ($map[$key] ?? 0),
            ];
        }

        return $out;
    }

    /* ---------------- DAILY TREND ---------------- */

    private function countByDayTrend($table, string $column, int $days)
    {
        $start = now()->startOfDay()->subDays($days - 1);

        $rows = DB::table($table)
            ->where($column, '>=', $start)
            ->selectRaw("date_trunc('day', $column) as d, COUNT(*) as c")
            ->groupBy('d')
            ->orderBy('d')
            ->get();

        $map = [];

        foreach ($rows as $r) {
            $map[$r->d] = (int) $r->c;
        }

        $out = [];

        for ($i = 0; $i < $days; $i++) {
            $day = (clone $start)->addDays($i)->startOfDay()->toDateTimeString();

            $out[] = (int) ($map[$day] ?? 0);
        }

        return $out;
    }
}