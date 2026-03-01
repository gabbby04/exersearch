<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GymActivityFeedController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $limit = (int)($request->query('limit', 5));
        $limit = max(1, min(20, $limit));

        $rows = DB::table('gym_interactions as gi')
            ->join('gyms as g', 'g.gym_id', '=', 'gi.gym_id')
            ->where('gi.user_id', $user->user_id)
            ->where('g.status', 'approved')
            ->orderByDesc('gi.created_at')
            ->limit($limit)
            ->get([
                'gi.event',
                'gi.source',
                'gi.created_at',
                'g.gym_id',
                'g.name as gym_name',
                'g.main_image_url',
                'g.address',
                'g.gym_type',
                'g.daily_price',
                'g.monthly_price',
            ]);

        return response()->json(['data' => $rows]);
    }
}