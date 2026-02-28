<?php

namespace App\Http\Controllers;

use App\Models\Gym;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GymInteractionController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user(); // may be null now

        $validated = $request->validate([
            'gym_id' => ['required', 'integer'],
            'event' => ['required', 'string', 'max:30'],
            'source' => ['nullable', 'string', 'max:30'],
            'session_id' => ['nullable', 'string', 'max:64'],
            'meta' => ['nullable'],
        ]);

        $allowed = ['view', 'click', 'save', 'contact', 'visit', 'subscribe'];
        if (!in_array($validated['event'], $allowed, true)) {
            return response()->json(['message' => 'Invalid event'], 422);
        }

        $gym = Gym::where('gym_id', (int)$validated['gym_id'])
            ->where('status', 'approved')
            ->first();

        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        // Require session_id for guests
        $sessionId = $validated['session_id'] ?? null;
        if (!$user && !$sessionId) {
            // auto-generate so it still logs (client should store it)
            $sessionId = Str::uuid()->toString();
        }

        $meta = $validated['meta'] ?? null;
        if (is_array($meta) || is_object($meta)) $meta = json_encode($meta);

        DB::table('gym_interactions')->insert([
            'user_id' => $user?->user_id, // null for guests
            'gym_id' => (int)$validated['gym_id'],
            'event' => $validated['event'],
            'source' => $validated['source'] ?? null,
            'session_id' => $sessionId,
            'meta' => $meta,
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Logged',
            'session_id' => $sessionId, // helpful so frontend can store it
        ], 201);
    }
}