<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\GymRating;

class GymRatingSummaryController extends Controller
{
    public function index(Request $request)
    {
        $gymIds = $request->query('gym_ids');

        $q = GymRating::query()
            ->selectRaw('gym_id, COUNT(*)::int as reviews_count, AVG(stars)::float as avg_rating')
            ->where('verified', true);

        if ($gymIds) {
            if (is_string($gymIds)) {
                $gymIds = array_filter(array_map('intval', explode(',', $gymIds)));
            }
            if (is_array($gymIds) && count($gymIds)) {
                $q->whereIn('gym_id', $gymIds);
            }
        }

        $rows = $q->groupBy('gym_id')->get();

        $map = [];
        foreach ($rows as $r) {
            $map[(int)$r->gym_id] = [
                'avg_rating' => round((float)$r->avg_rating, 2),
                'reviews_count' => (int)$r->reviews_count,
            ];
        }

        return response()->json(['data' => $map]);
    }
}