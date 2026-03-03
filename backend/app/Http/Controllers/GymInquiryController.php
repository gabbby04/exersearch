<?php

namespace App\Http\Controllers;

use App\Models\Gym;
use App\Models\GymInquiry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Services\NotificationService;

class GymInquiryController extends Controller
{
    private function attachUserProfilePhotoUrl($inq)
    {
        $raw = $inq?->user?->userProfile?->profile_photo_url;

        $inq->user_profile_photo_url = $raw
            ? (str_starts_with($raw, 'http') ? $raw : asset(ltrim($raw, '/')))
            : null;

        return $inq;
    }

    private function attachUserProfilePhotoUrlToPaginator($paginator)
    {
        if (!$paginator) return $paginator;

        $paginator->getCollection()->transform(function ($inq) {
            return $this->attachUserProfilePhotoUrl($inq);
        });

        return $paginator;
    }

    private function resolveOwnerRecipientId(?Gym $gym): ?int
    {
        if ($gym && !empty($gym->owner_id)) {
            return (int) $gym->owner_id;
        }

        $fallbackAdminId = User::whereIn('role', ['superadmin', 'admin'])
            ->orderByRaw("CASE WHEN role = 'superadmin' THEN 0 ELSE 1 END")
            ->orderBy('user_id')
            ->value('user_id');

        return !empty($fallbackAdminId) ? (int) $fallbackAdminId : null;
    }

    public function ask(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $gym = Gym::where('gym_id', $gymId)->where('status', 'approved')->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        $request->validate([
            'question' => ['required', 'string', 'min:3', 'max:1500'],
            'attachment_url' => ['nullable', 'string', 'max:4000'],
        ]);

        $row = GymInquiry::create([
            'gym_id' => $gymId,
            'user_id' => $user->user_id,
            'status' => 'open',
            'question' => $request->input('question'),
            'attachment_url' => $request->input('attachment_url'),
            'user_read_at' => now(),
            'owner_read_at' => null,
        ]);

        $recipientId = $this->resolveOwnerRecipientId($gym);

        if (!empty($recipientId)) {
            NotificationService::create([
                'recipient_id' => (int) $recipientId,
                'recipient_role' => 'owner',
                'type' => 'INQUIRY_RECEIVED',
                'title' => 'New inquiry received',
                'message' => ($user->name ?? 'A user') . ' sent an inquiry for "' . ($gym->name ?? 'your gym') . '".',
                'gym_id' => (int) $gym->gym_id,
                'actor_id' => (int) $user->user_id,
                'url' => '/owner/inquiries?gym_id=' . (int) $gym->gym_id,
                'meta' => [
                    'inquiry_id' => (int) $row->inquiry_id,
                    'unassigned_owner' => empty($gym->owner_id),
                ],
            ]);
        }

        $inq = $row->load(['gym']);
        return response()->json(['message' => 'Inquiry submitted', 'inquiry' => $inq], 201);
    }

    public function userReply(Request $request, $inquiryId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $row = GymInquiry::where('inquiry_id', $inquiryId)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$row) return response()->json(['message' => 'Inquiry not found'], 404);

        $gym = Gym::where('gym_id', $row->gym_id)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        // CHANGE: allow follow-up even if closed (reopen)
        // (removed the "Inquiry is closed" 422 check)

        $request->validate([
            'message' => ['required', 'string', 'min:1', 'max:1500'],
            'attachment_url' => ['nullable', 'string', 'max:4000'],
        ]);

        $msg = trim((string) $request->input('message'));

        // CHANGE: tag when it was previously closed
        $tag = $row->status === 'closed'
            ? "User follow-up (reopened) " . now()->toDateTimeString()
            : "User follow-up " . now()->toDateTimeString();

        $append = "\n\n[{$tag}]\n" . $msg;
        $newQuestion = (string) ($row->question ?? '') . $append;

        $row->update([
            'question' => $newQuestion,
            'attachment_url' => $request->input('attachment_url', $row->attachment_url),
            'status' => 'open',
            'user_read_at' => now(),
            'owner_read_at' => null,
        ]);

        $recipientId = $this->resolveOwnerRecipientId($gym);

        if (!empty($recipientId)) {
            NotificationService::create([
                'recipient_id' => (int) $recipientId,
                'recipient_role' => 'owner',
                'type' => 'INQUIRY_UPDATED',
                'title' => 'Inquiry updated',
                'message' => ($user->name ?? 'A user') . ' replied to an inquiry for "' . ($gym->name ?? 'your gym') . '".',
                'gym_id' => (int) $gym->gym_id,
                'actor_id' => (int) $user->user_id,
                'url' => '/owner/inquiries?gym_id=' . (int) $gym->gym_id,
                'meta' => [
                    'inquiry_id' => (int) $row->inquiry_id,
                    'unassigned_owner' => empty($gym->owner_id),
                ],
            ]);
        }

        return response()->json([
            'message' => 'Reply sent',
            'inquiry' => $row->fresh()->load(['gym']),
        ]);
    }

    public function myInquiries(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $request->validate([
            'status' => ['nullable', Rule::in(['open', 'answered', 'closed'])],
            'gym_id' => ['nullable'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = GymInquiry::with(['gym', 'answeredByOwner'])
            ->where('user_id', $user->user_id);

        if ($request->filled('status')) $q->where('status', $request->query('status'));
        if ($request->filled('gym_id')) $q->where('gym_id', $request->query('gym_id'));

        $rows = $q->orderByDesc('created_at')
            ->paginate((int)($request->query('per_page', 20)));

        return response()->json($rows);
    }

    public function ownerList(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        if (!in_array($user->role, ['owner', 'admin', 'superadmin'])) return response()->json(['message' => 'Forbidden'], 403);

        $gym = Gym::where('gym_id', $gymId)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);
        if ($user->role === 'owner' && (int)$gym->owner_id !== (int)$user->user_id) return response()->json(['message' => 'Forbidden'], 403);

        $request->validate([
            'status' => ['nullable', Rule::in(['open', 'answered', 'closed'])],
            'q' => ['nullable', 'string', 'max:200'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = GymInquiry::with(['user.userProfile', 'answeredByOwner'])
            ->where('gym_id', $gymId);

        if ($request->filled('status')) $q->where('status', $request->query('status'));

        if ($request->filled('q')) {
            $search = $request->query('q');
            $q->where(function ($qq) use ($search) {
                $qq->where('question', 'ilike', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'ilike', "%{$search}%")
                           ->orWhere('email', 'ilike', "%{$search}%");
                    });
            });
        }

        $rows = $q->orderByDesc('created_at')
            ->paginate((int)($request->query('per_page', 20)));

        $rows = $this->attachUserProfilePhotoUrlToPaginator($rows);
        return response()->json($rows);
    }

    public function ownerSummary(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        if (!in_array($user->role, ['owner', 'admin', 'superadmin'])) return response()->json(['message' => 'Forbidden'], 403);

        $gymsQ = Gym::query()->select(['gym_id', 'name', 'owner_id']);
        if ($user->role === 'owner') $gymsQ->where('owner_id', $user->user_id);

        $gymIds = $gymsQ->pluck('gym_id');
        if ($gymIds->isEmpty()) return response()->json(['data' => []]);

        $agg = GymInquiry::query()
            ->selectRaw('gym_id')
            ->selectRaw("SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_count")
            ->selectRaw("COUNT(*) AS total_count")
            ->selectRaw("MAX(created_at) AS latest_at")
            ->whereIn('gym_id', $gymIds)
            ->groupBy('gym_id')
            ->get()
            ->keyBy('gym_id');

        $out = [];
        foreach ($gymsQ->get() as $g) {
            $a = $agg->get($g->gym_id);
            $out[] = [
                'gym_id' => (int)$g->gym_id,
                'gym_name' => $g->name,
                'open_count' => (int)($a->open_count ?? 0),
                'total_count' => (int)($a->total_count ?? 0),
                'latest_at' => $a->latest_at ?? null,
            ];
        }

        return response()->json(['data' => $out]);
    }

    public function ownerAnswer(Request $request, $inquiryId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        if (!in_array($user->role, ['owner', 'admin', 'superadmin'])) return response()->json(['message' => 'Forbidden'], 403);

        $row = GymInquiry::where('inquiry_id', $inquiryId)->first();
        if (!$row) return response()->json(['message' => 'Inquiry not found'], 404);

        $gym = Gym::where('gym_id', $row->gym_id)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);
        if ($user->role === 'owner' && (int)$gym->owner_id !== (int)$user->user_id) return response()->json(['message' => 'Forbidden'], 403);


        $request->validate(['answer' => ['required', 'string', 'min:1', 'max:1500']]);

        $row->update([
            'answer' => $request->input('answer'),
            'status' => 'answered',
            'answered_at' => now(),
            'answered_by_owner_id' => $user->user_id,
            'owner_read_at' => now(),
        ]);

        NotificationService::create([
            'recipient_id' => (int) $row->user_id,
            'recipient_role' => 'user',
            'type' => 'INQUIRY_REPLIED',
            'title' => 'Inquiry replied',
            'message' => 'Your inquiry to "' . ($gym->name ?? 'a gym') . '" has a reply.',
            'gym_id' => (int) $gym->gym_id,
            'actor_id' => (int) $user->user_id,
            'url' => '/home/inquiries',
            'meta' => ['inquiry_id' => (int) $row->inquiry_id],
        ]);

        $inq = $row->fresh()->load(['user.userProfile', 'gym', 'answeredByOwner']);
        $inq = $this->attachUserProfilePhotoUrl($inq);

        return response()->json(['message' => 'Inquiry answered', 'inquiry' => $inq]);
    }

    public function ownerClose(Request $request, $inquiryId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        if (!in_array($user->role, ['owner', 'admin', 'superadmin'])) return response()->json(['message' => 'Forbidden'], 403);

        $row = GymInquiry::where('inquiry_id', $inquiryId)->first();
        if (!$row) return response()->json(['message' => 'Inquiry not found'], 404);

        $gym = Gym::where('gym_id', $row->gym_id)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);
        if ($user->role === 'owner' && (int)$gym->owner_id !== (int)$user->user_id) return response()->json(['message' => 'Forbidden'], 403);

        if ($row->status === 'closed') {
            $inq = $row->load(['user.userProfile', 'gym']);
            $inq = $this->attachUserProfilePhotoUrl($inq);

            return response()->json(['message' => 'Inquiry already closed', 'inquiry' => $inq]);
        }

        $row->update([
            'status' => 'closed',
            'closed_at' => now(),
            'closed_by_owner_id' => $user->user_id,
            'owner_read_at' => now(),
        ]);

        // CHANGE: removed INQUIRY_CLOSED notification spam

        $inq = $row->fresh()->load(['user.userProfile', 'gym', 'closedByOwner']);
        $inq = $this->attachUserProfilePhotoUrl($inq);

        return response()->json(['message' => 'Inquiry closed', 'inquiry' => $inq]);
    }

    public function userMarkRead(Request $request, $inquiryId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $row = GymInquiry::where('inquiry_id', $inquiryId)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$row) return response()->json(['message' => 'Inquiry not found'], 404);

        $row->update(['user_read_at' => now()]);

        return response()->json([
            'message' => 'Marked as read',
            'inquiry' => $row->fresh()->load(['gym', 'answeredByOwner']),
        ]);
    }

    public function ownerMarkRead(Request $request, $inquiryId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        if (!in_array($user->role, ['owner', 'admin', 'superadmin'])) return response()->json(['message' => 'Forbidden'], 403);

        $row = GymInquiry::where('inquiry_id', $inquiryId)->first();
        if (!$row) return response()->json(['message' => 'Inquiry not found'], 404);

        $gym = Gym::where('gym_id', $row->gym_id)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);
        if ($user->role === 'owner' && (int)$gym->owner_id !== (int)$user->user_id) return response()->json(['message' => 'Forbidden'], 403);

        $row->update(['owner_read_at' => now()]);

        $inq = $row->fresh()->load(['user.userProfile', 'gym', 'answeredByOwner']);
        $inq = $this->attachUserProfilePhotoUrl($inq);

        return response()->json(['message' => 'Marked as read', 'inquiry' => $inq]);
    }
}