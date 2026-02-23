<?php

namespace App\Http\Controllers;

use App\Models\Gym;
use App\Models\GymInquiry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class GymInquiryController extends Controller
{
    public function ask(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $gym = Gym::where('gym_id', $gymId)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        $request->validate([
            'question' => ['required', 'string', 'min:3', 'max:1500'],
        ]);

        $row = GymInquiry::create([
            'gym_id' => $gymId,
            'user_id' => $user->user_id,
            'status' => 'open',
            'question' => $request->input('question'),
        ]);

        return response()->json([
            'message' => 'Inquiry submitted',
            'inquiry' => $row,
        ], 201);
    }

    public function myInquiries(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $rows = GymInquiry::with(['gym'])
            ->where('user_id', $user->user_id)
            ->orderByDesc('created_at')
            ->paginate((int)($request->query('per_page', 20)));

        return response()->json($rows);
    }

    public function ownerList(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        if (!in_array($user->role, ['owner', 'admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $gym = Gym::where('gym_id', $gymId)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);
        if ($user->role === 'owner' && (int)$gym->owner_id !== (int)$user->user_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'status' => ['nullable', Rule::in(['open', 'answered', 'closed'])],
            'q' => ['nullable', 'string', 'max:200'],
        ]);

        $q = GymInquiry::with(['user', 'answeredByOwner'])
            ->where('gym_id', $gymId);

        if ($request->filled('status')) {
            $q->where('status', $request->query('status'));
        }

        if ($request->filled('q')) {
            $search = $request->query('q');
            $q->where('question', 'ilike', "%{$search}%")
              ->orWhereHas('user', function ($uq) use ($search) {
                  $uq->where('name', 'ilike', "%{$search}%")
                     ->orWhere('email', 'ilike', "%{$search}%");
              });
        }

        $rows = $q->orderByDesc('created_at')
            ->paginate((int)($request->query('per_page', 20)));

        return response()->json($rows);
    }

    public function ownerAnswer(Request $request, $inquiryId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        if (!in_array($user->role, ['owner', 'admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $row = GymInquiry::where('inquiry_id', $inquiryId)->first();
        if (!$row) return response()->json(['message' => 'Inquiry not found'], 404);

        $gym = Gym::where('gym_id', $row->gym_id)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);
        if ($user->role === 'owner' && (int)$gym->owner_id !== (int)$user->user_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'answer' => ['required', 'string', 'min:1', 'max:1500'],
        ]);

        $row->update([
            'answer' => $request->input('answer'),
            'status' => 'answered',
            'answered_at' => now(),
            'answered_by_owner_id' => $user->user_id,
        ]);

        return response()->json([
            'message' => 'Inquiry answered',
            'inquiry' => $row->fresh(),
        ]);
    }
}