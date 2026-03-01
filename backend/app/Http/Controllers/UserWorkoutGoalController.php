<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;
use App\Models\UserWorkoutPlan;

class UserWorkoutGoalController extends Controller
{
    // GET /api/v1/user/workout-goal
    public function show(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        // Choose user's active plan (adjust status if you use different values)
        $plan = UserWorkoutPlan::query()
            ->where('user_id', $user->user_id)
            ->whereIn('status', ['active', 'ongoing'])
            ->orderByDesc('start_date')
            ->first();

        if (!$plan) {
            return response()->json([
                'data' => [
                    'has_plan' => false,
                    'done' => 0,
                    'target' => 0,
                    'pct' => 0,
                    'week_start' => Carbon::now()->startOfWeek()->toDateString(),
                    'week_end' => Carbon::now()->endOfWeek()->toDateString(),
                ]
            ]);
        }

        // Denominator:
        // Prefer template.days_per_week if you trust it.
        // Or count non-rest days from plan->days.
        $templateDaysPerWeek = (int) optional($plan->template)->days_per_week;
        $planDaysCount = $plan->days()->where('is_rest', false)->count();

        $target = $templateDaysPerWeek > 0 ? $templateDaysPerWeek : $planDaysCount;

        // Numerator: count completed_at within current week for this plan
        $weekStart = Carbon::now()->startOfWeek();
        $weekEnd = Carbon::now()->endOfWeek();

        $done = $plan->days()
            ->whereNotNull('completed_at')
            ->whereBetween('completed_at', [$weekStart, $weekEnd])
            ->count();

        $pct = $target > 0 ? (int) round(($done / $target) * 100) : 0;

        return response()->json([
            'data' => [
                'has_plan' => true,
                'user_plan_id' => $plan->user_plan_id,
                'template_id' => $plan->template_id,
                'done' => $done,
                'target' => $target,
                'pct' => max(0, min(100, $pct)),
                'week_start' => $weekStart->toDateString(),
                'week_end' => $weekEnd->toDateString(),
            ]
        ]);
    }
}