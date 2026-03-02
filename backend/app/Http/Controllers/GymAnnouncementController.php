<?php

namespace App\Http\Controllers;

use App\Models\Gym;
use App\Models\GymAnnouncement;
use App\Models\GymMembership;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Services\NotificationService;

class GymAnnouncementController extends Controller
{
    private int $weeklyLimit = 3;

    private function isOwnerAllowedForGym($user, Gym $gym): bool
    {
        if (!$user) return false;
        if (in_array($user->role, ['admin', 'superadmin'])) return true;
        return $user->role === 'owner' && (int) $gym->owner_id === (int) $user->user_id;
    }

    public function ownerCreate(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $gym = Gym::where('gym_id', (int) $gymId)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        if (!$this->isOwnerAllowedForGym($user, $gym)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ((bool) $gym->is_announcement_blocked) {
            return response()->json(['message' => 'Announcements are blocked for this gym'], 403);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'min:3', 'max:160'],
            'body'  => ['required', 'string', 'min:3', 'max:5000'],
            'meta'  => ['nullable', 'array'],
            'audience' => ['nullable', 'array'],
            'audience.saved' => ['nullable', 'boolean'],
            'audience.members' => ['nullable', 'boolean'],
        ]);

        $aud = $data['audience'] ?? [];
        $sendToSaved = array_key_exists('saved', $aud) ? (bool) $aud['saved'] : true;
        $sendToMembers = array_key_exists('members', $aud) ? (bool) $aud['members'] : false;

        if (!$sendToSaved && !$sendToMembers) {
            return response()->json(['message' => 'Choose at least one audience (saved/members).'], 422);
        }

        $since = Carbon::now()->subDays(7);

        $recentCount = GymAnnouncement::where('gym_id', (int) $gym->gym_id)
            ->where('is_deleted', false)
            ->where('created_at', '>=', $since)
            ->count();

        if ($recentCount >= $this->weeklyLimit) {
            return response()->json([
                'message' => 'Weekly announcement limit reached',
                'limit' => $this->weeklyLimit,
                'window_days' => 7,
            ], 429);
        }

        $announcement = GymAnnouncement::create([
            'gym_id' => (int) $gym->gym_id,
            'owner_id' => (int) $user->user_id,
            'title' => $data['title'],
            'body' => $data['body'],
            'meta' => $data['meta'] ?? null,
            'is_deleted' => false,
        ]);

        $recipientIds = [];

        if ($sendToSaved) {
            $savedIds = DB::table('saved_gyms')
                ->where('gym_id', (int) $gym->gym_id)
                ->pluck('user_id')
                ->all();
            $recipientIds = array_merge($recipientIds, $savedIds);
        }

        if ($sendToMembers) {
            $memberIds = GymMembership::where('gym_id', (int) $gym->gym_id)
                ->where('status', 'active')
                ->pluck('user_id')
                ->all();
            $recipientIds = array_merge($recipientIds, $memberIds);
        }

        $recipientIds = array_values(array_unique(array_map('intval', $recipientIds)));
        $recipientIds = array_values(array_filter($recipientIds, fn ($id) => $id !== (int) $user->user_id));

        if (!empty($recipientIds)) {
            $rows = [];
            foreach ($recipientIds as $uid) {
                $rows[] = [
                    'recipient_id' => (int) $uid,
                    'recipient_role' => 'user',
                    'type' => 'GYM_ANNOUNCEMENT',
                    'title' => 'New gym announcement',
                    'message' => '"' . ($gym->name ?? 'A gym') . '" posted: ' . (string) $announcement->title,
                    'url' => '/home/gym/' . (int) $gym->gym_id . '?tab=announcements',
                    'gym_id' => (int) $gym->gym_id,
                    'actor_id' => (int) $user->user_id,
                    'meta' => [
                        'announcement_id' => (int) $announcement->announcement_id,
                        'audience' => [
                            'saved' => $sendToSaved,
                            'members' => $sendToMembers,
                        ],
                    ],
                ];
            }
            NotificationService::bulkInsert($rows);
        }

        NotificationService::notifyAdmins(
            'GYM_ANNOUNCEMENT_CREATED',
            'Gym announcement created',
            'Announcement posted by "' . ($gym->name ?? 'a gym') . '": ' . (string) $announcement->title,
            [
                'gym_id' => (int) $gym->gym_id,
                'actor_id' => (int) $user->user_id,
                'url' => '/admin/gyms/' . (int) $gym->gym_id,
                'meta' => [
                    'announcement_id' => (int) $announcement->announcement_id,
                ],
            ]
        );

        return response()->json([
            'message' => 'Announcement created',
            'announcement' => $announcement,
        ], 201);
    }

    public function ownerList(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $gym = Gym::where('gym_id', (int) $gymId)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        if (!$this->isOwnerAllowedForGym($user, $gym)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $perPage = max(1, min((int) $request->query('per_page', 20), 100));

        $rows = GymAnnouncement::where('gym_id', (int) $gym->gym_id)
            ->where('is_deleted', false)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json($rows);
    }

    public function publicList(Request $request, $gymId)
    {
        $gym = Gym::where('gym_id', (int) $gymId)
            ->where('status', 'approved')
            ->first();

        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        $perPage = max(1, min((int) $request->query('per_page', 10), 50));

        $rows = GymAnnouncement::where('gym_id', (int) $gym->gym_id)
            ->where('is_deleted', false)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json($rows);
    }

    public function adminList(Request $request)
    {
        $user = Auth::user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $perPage = max(1, min((int) $request->query('per_page', 50), 200));

        $rows = GymAnnouncement::query()
            ->select('gym_announcements.*')
            ->leftJoin('gyms', 'gyms.gym_id', '=', 'gym_announcements.gym_id')
            ->leftJoin('users as owners', 'owners.user_id', '=', 'gyms.owner_id')
            ->addSelect([
                'gyms.name as gym_name',
                'owners.name as owner_name',
                'owners.email as owner_email',
            ])
            ->orderByDesc('gym_announcements.created_at')
            ->paginate($perPage);

        return response()->json($rows);
    }

    public function adminDelete(Request $request, $announcementId)
    {
        $user = Auth::user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $ann = GymAnnouncement::where('announcement_id', (int) $announcementId)->first();
        if (!$ann) return response()->json(['message' => 'Announcement not found'], 404);

        if ((bool) $ann->is_deleted) {
            return response()->json(['message' => 'Already deleted'], 200);
        }

        $ann->update([
            'is_deleted' => true,
            'deleted_by' => (int) $user->user_id,
            'deleted_at' => now(),
        ]);

        return response()->json(['message' => 'Announcement deleted']);
    }

    public function adminBlockGym(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $gym = Gym::where('gym_id', (int) $gymId)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        $gym->update([
            'is_announcement_blocked' => true,
            'announcement_blocked_at' => now(),
            'announcement_blocked_by' => (int) $user->user_id,
        ]);

        return response()->json(['message' => 'Gym blocked from announcements', 'gym' => $gym->fresh()]);
    }

    public function adminUnblockGym(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $gym = Gym::where('gym_id', (int) $gymId)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        $gym->update([
            'is_announcement_blocked' => false,
            'announcement_blocked_at' => null,
            'announcement_blocked_by' => null,
        ]);

        return response()->json(['message' => 'Gym unblocked from announcements', 'gym' => $gym->fresh()]);
    }

    public function ownerDelete(Request $request, $announcementId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $ann = GymAnnouncement::where('announcement_id', (int) $announcementId)->first();
        if (!$ann) return response()->json(['message' => 'Announcement not found'], 404);

        $gym = Gym::where('gym_id', (int) $ann->gym_id)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        if (
            !in_array($user->role, ['admin', 'superadmin']) &&
            !($user->role === 'owner' && (int) $gym->owner_id === (int) $user->user_id)
        ) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ((bool) $ann->is_deleted) {
            return response()->json(['message' => 'Already deleted'], 200);
        }

        $ann->update([
            'is_deleted' => true,
            'deleted_by' => (int) $user->user_id,
            'deleted_at' => now(),
        ]);

        return response()->json(['message' => 'Announcement deleted']);
    }
}