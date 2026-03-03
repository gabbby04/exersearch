<?php

namespace App\Http\Controllers;

use App\Models\Gym;
use App\Models\GymMembership;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Services\NotificationService;

class GymMembershipController extends Controller
{
    public function intent(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $gym = Gym::where('gym_id', $gymId)->where('status', 'approved')->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        $request->validate([
            'plan_type' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $active = GymMembership::where('gym_id', $gymId)
            ->where('user_id', $user->user_id)
            ->where('status', 'active')
            ->first();

        if ($active) return response()->json(['message' => 'Membership already active'], 409);

        $existingIntent = GymMembership::where('gym_id', $gymId)
            ->where('user_id', $user->user_id)
            ->where('status', 'intent')
            ->first();

        if ($existingIntent) {
            $existingIntent->update([
                'plan_type' => $request->input('plan_type', $existingIntent->plan_type),
                'notes' => $request->input('notes', $existingIntent->notes),
            ]);

            return response()->json([
                'message' => 'Intent already exists (updated)',
                'membership' => $existingIntent,
            ]);
        }

        $membership = GymMembership::create([
            'gym_id' => $gymId,
            'user_id' => $user->user_id,
            'status' => 'intent',
            'plan_type' => $request->input('plan_type'),
            'notes' => $request->input('notes'),
        ]);

        if (!empty($gym->owner_id)) {
            NotificationService::create([
                'recipient_id' => (int) $gym->owner_id,
                'recipient_role' => 'owner',
                'type' => 'MEMBERSHIP_REQUESTED',
                'title' => 'New membership request',
                'message' => ($user->name ?? 'A user') . ' requested membership for "' . ($gym->name ?? 'your gym') . '".',
                'gym_id' => (int) $gym->gym_id,
                'actor_id' => (int) $user->user_id,
                'url' => '/owner/memberships?gym_id=' . (int) $gym->gym_id,
                'meta' => [
                    'membership_id' => (int) $membership->membership_id,
                    'unassigned_owner' => false,
                ],
            ]);
        } else {
            $fallbackOwnerId = (int) (DB::table('users')
                ->whereIn('role', ['superadmin', 'admin'])
                ->orderByRaw("CASE WHEN role = 'superadmin' THEN 0 ELSE 1 END")
                ->orderBy('user_id')
                ->value('user_id') ?? 0);

            if ($fallbackOwnerId > 0) {
                NotificationService::create([
                    'recipient_id' => $fallbackOwnerId,
                    'recipient_role' => 'owner',
                    'type' => 'MEMBERSHIP_REQUESTED',
                    'title' => 'New membership request',
                    'message' => ($user->name ?? 'A user') . ' requested membership for "' . ($gym->name ?? 'your gym') . '".',
                    'gym_id' => (int) $gym->gym_id,
                    'actor_id' => (int) $user->user_id,
                    'url' => '/owner/memberships?gym_id=' . (int) $gym->gym_id,
                    'meta' => [
                        'membership_id' => (int) $membership->membership_id,
                        'unassigned_owner' => true,
                    ],
                ]);
            }

            NotificationService::notifyAdmins(
                'MEMBERSHIP_REQUESTED',
                'New membership request (unassigned gym)',
                ($user->name ?? 'A user') . ' requested membership for "' . ($gym->name ?? 'a gym') . '" (no owner assigned).',
                [
                    'gym_id' => (int) $gym->gym_id,
                    'actor_id' => (int) $user->user_id,
                    'url' => '/admin/gyms/' . (int) $gym->gym_id,
                    'meta' => [
                        'membership_id' => (int) $membership->membership_id,
                        'unassigned_owner' => true,
                    ],
                ]
            );
        }

        return response()->json([
            'message' => 'Membership intent created',
            'membership' => $membership,
        ], 201);
    }

    public function myMemberships(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $rows = GymMembership::with(['gym'])
            ->where('user_id', $user->user_id)
            ->orderByDesc('created_at')
            ->paginate((int)($request->query('per_page', 20)));

        return response()->json($rows);
    }

    public function myForGym(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $m = GymMembership::where('gym_id', $gymId)
            ->where('user_id', $user->user_id)
            ->orderByDesc('created_at')
            ->first();

        return response()->json(['membership' => $m], 200);
    }

    public function userCancel(Request $request, $membershipId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $m = GymMembership::where('membership_id', $membershipId)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$m) return response()->json(['message' => 'Membership not found'], 404);

        if (!in_array((string) $m->status, ['active', 'intent', 'needs_info'], true)) {
            return response()->json(['message' => 'Only active/intent/needs_info memberships can be cancelled'], 409);
        }

        $gym = Gym::where('gym_id', $m->gym_id)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);

        $m->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
        ]);

        $ownerRecipientId = !empty($gym->owner_id) ? (int) $gym->owner_id : 0;

        NotificationService::create([
            'recipient_id' => (int) $ownerRecipientId,
            'recipient_role' => 'owner',
            'type' => 'MEMBERSHIP_CANCELLED',
            'title' => 'Membership cancelled',
            'message' => ($user->name ?? 'A user') . ' cancelled membership for "' . ($gym->name ?? 'your gym') . '".',
            'gym_id' => (int) $gym->gym_id,
            'actor_id' => (int) $user->user_id,
            'url' => '/owner/memberships?gym_id=' . (int) $gym->gym_id,
            'meta' => [
                'membership_id' => (int) $m->membership_id,
                'unassigned_owner' => empty($gym->owner_id),
            ],
        ]);

        return response()->json([
            'message' => 'Membership cancelled',
            'membership' => $m->fresh(),
        ]);
    }

    public function ownerList(Request $request, $gymId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        if (!in_array($user->role, ['owner', 'admin', 'superadmin'], true)) return response()->json(['message' => 'Forbidden'], 403);

        $gym = Gym::where('gym_id', $gymId)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);
        if ($user->role === 'owner' && (int)$gym->owner_id !== (int)$user->user_id) return response()->json(['message' => 'Forbidden'], 403);

        $request->validate([
            'status' => ['nullable', Rule::in(['intent', 'needs_info', 'active', 'expired', 'cancelled', 'rejected'])],
            'q' => ['nullable', 'string', 'max:200'],
        ]);

        $q = GymMembership::with(['user'])
            ->where('gym_id', $gymId);

        if ($request->filled('status')) $q->where('status', $request->query('status'));

        if ($request->filled('q')) {
            $search = $request->query('q');
            $q->whereHas('user', function ($uq) use ($search) {
                $uq->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $rows = $q->orderByDesc('created_at')
            ->paginate((int)($request->query('per_page', 20)));

        return response()->json($rows);
    }

    public function ownerActivate(Request $request, $membershipId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        if (!in_array($user->role, ['owner', 'admin', 'superadmin'], true)) return response()->json(['message' => 'Forbidden'], 403);

        $membership = GymMembership::where('membership_id', $membershipId)->first();
        if (!$membership) return response()->json(['message' => 'Membership not found'], 404);

        $gym = Gym::where('gym_id', $membership->gym_id)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);
        if ($user->role === 'owner' && (int)$gym->owner_id !== (int)$user->user_id) return response()->json(['message' => 'Forbidden'], 403);

        $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'plan_type' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if (!in_array((string)$membership->status, ['intent', 'needs_info', 'expired'], true)) {
            return response()->json(['message' => 'Only intent/needs_info/expired memberships can be activated'], 409);
        }

        $existingActive = GymMembership::where('gym_id', $membership->gym_id)
            ->where('user_id', $membership->user_id)
            ->where('status', 'active')
            ->where('membership_id', '!=', $membership->membership_id)
            ->first();

        if ($existingActive) return response()->json(['message' => 'User already has an active membership for this gym'], 409);

        $membership->update([
            'status' => 'active',
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'activated_at' => now(),
            'plan_type' => $request->input('plan_type', $membership->plan_type),
            'notes' => $request->input('notes', $membership->notes),
            'cancelled_at' => null,
        ]);

        NotificationService::create([
            'recipient_id' => (int) $membership->user_id,
            'recipient_role' => 'user',
            'type' => 'MEMBERSHIP_APPROVED',
            'title' => 'Membership approved',
            'message' => 'Your membership at "' . ($gym->name ?? 'a gym') . '" is now active.',
            'gym_id' => (int) $gym->gym_id,
            'actor_id' => (int) $user->user_id,
            'url' => '/home/memberships',
            'meta' => [
                'membership_id' => (int) $membership->membership_id,
                'start_date' => (string) $membership->start_date,
                'end_date' => (string) $membership->end_date,
            ],
        ]);

        return response()->json([
            'message' => 'Membership activated',
            'membership' => $membership->fresh(),
        ]);
    }

    public function ownerUpdateStatus(Request $request, $membershipId)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        if (!in_array($user->role, ['owner', 'admin', 'superadmin'], true)) return response()->json(['message' => 'Forbidden'], 403);

        $membership = GymMembership::where('membership_id', $membershipId)->first();
        if (!$membership) return response()->json(['message' => 'Membership not found'], 404);

        $gym = Gym::where('gym_id', $membership->gym_id)->first();
        if (!$gym) return response()->json(['message' => 'Gym not found'], 404);
        if ($user->role === 'owner' && (int)$gym->owner_id !== (int)$user->user_id) return response()->json(['message' => 'Forbidden'], 403);

        $request->validate([
            'status' => ['required', Rule::in(['intent', 'needs_info', 'active', 'expired', 'cancelled', 'rejected'])],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'plan_type' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $prevStatus = (string) $membership->status;
        $nextStatus = (string) $request->input('status');

        $prevStart = $membership->start_date ? (string) $membership->start_date : null;
        $prevEnd = $membership->end_date ? (string) $membership->end_date : null;
        $prevPlan = $membership->plan_type !== null ? (string) $membership->plan_type : null;
        $prevNotes = $membership->notes !== null ? (string) $membership->notes : null;

        if ($nextStatus === 'active' && $prevStatus !== 'active') {
            return response()->json([
                'message' => 'Use ownerActivate to approve/activate membership (sets dates and sends approval notification).'
            ], 422);
        }

        $payload = [
            'status' => $nextStatus,
            'notes' => $request->input('notes', $membership->notes),
            'plan_type' => $request->input('plan_type', $membership->plan_type),
        ];

        if ($request->filled('start_date')) $payload['start_date'] = $request->input('start_date');
        if ($request->filled('end_date')) $payload['end_date'] = $request->input('end_date');

        if ($nextStatus === 'cancelled') {
            $payload['cancelled_at'] = now();
        }

        $membership->update($payload);
        $membership = $membership->fresh();

        $newStart = $membership->start_date ? (string) $membership->start_date : null;
        $newEnd = $membership->end_date ? (string) $membership->end_date : null;
        $newPlan = $membership->plan_type !== null ? (string) $membership->plan_type : null;
        $newNotes = $membership->notes !== null ? (string) $membership->notes : null;

        $statusChanged = $prevStatus !== $nextStatus;
        $startChanged = $prevStart !== $newStart;
        $endChanged = $prevEnd !== $newEnd;
        $planChanged = $prevPlan !== $newPlan;
        $notesChanged = $prevNotes !== $newNotes;

        if ($statusChanged || $startChanged || $endChanged || $planChanged || $notesChanged) {
            $type = 'MEMBERSHIP_UPDATED';
            $title = 'Membership updated';
            $message = 'Your membership at "' . ($gym->name ?? 'a gym') . '" was updated.';

            if ($statusChanged) {
                $type = match ($nextStatus) {
                    'needs_info' => 'MEMBERSHIP_NEEDS_INFO',
                    'rejected' => 'MEMBERSHIP_REJECTED',
                    'cancelled' => 'MEMBERSHIP_CANCELLED',
                    'expired' => 'MEMBERSHIP_EXPIRED',
                    default => 'MEMBERSHIP_UPDATED',
                };

                $title = match ($nextStatus) {
                    'needs_info' => 'Membership needs more info',
                    'rejected' => 'Membership rejected',
                    'cancelled' => 'Membership cancelled',
                    'expired' => 'Membership expired',
                    default => 'Membership updated',
                };

                $noteSuffix = '';
                $note = trim((string) $request->input('notes', ''));
                if ($nextStatus === 'needs_info' && $note !== '') {
                    $noteSuffix = ' Note: ' . $note;
                }

                $message = match ($nextStatus) {
                    'needs_info' => 'The gym requested more information for your membership at "' . ($gym->name ?? 'a gym') . '".' . $noteSuffix,
                    'rejected' => 'Your membership request for "' . ($gym->name ?? 'a gym') . '" was rejected.',
                    'cancelled' => 'Your membership at "' . ($gym->name ?? 'a gym') . '" was cancelled.',
                    'expired' => 'Your membership at "' . ($gym->name ?? 'a gym') . '" has expired.',
                    default => 'Your membership status at "' . ($gym->name ?? 'a gym') . '" was updated.',
                };
            } else {
                if ($endChanged && $prevStatus === 'active' && $nextStatus === 'active') {
                    $type = 'MEMBERSHIP_EXTENDED';
                    $title = 'Membership updated';
                    $message = 'Your membership at "' . ($gym->name ?? 'a gym') . '" was updated.';
                }
            }

            NotificationService::create([
                'recipient_id' => (int) $membership->user_id,
                'recipient_role' => 'user',
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'gym_id' => (int) $gym->gym_id,
                'actor_id' => (int) $user->user_id,
                'url' => '/home/memberships',
                'meta' => [
                    'membership_id' => (int) $membership->membership_id,
                    'prev_status' => $prevStatus,
                    'next_status' => $nextStatus,
                    'changed' => [
                        'status' => (bool) $statusChanged,
                        'start_date' => (bool) $startChanged,
                        'end_date' => (bool) $endChanged,
                        'plan_type' => (bool) $planChanged,
                        'notes' => (bool) $notesChanged,
                    ],
                    'prev' => [
                        'start_date' => $prevStart,
                        'end_date' => $prevEnd,
                        'plan_type' => $prevPlan,
                        'notes' => $prevNotes,
                    ],
                    'next' => [
                        'start_date' => $newStart,
                        'end_date' => $newEnd,
                        'plan_type' => $newPlan,
                        'notes' => $newNotes,
                    ],
                ],
            ]);
        }

        return response()->json([
            'message' => 'Membership updated',
            'membership' => $membership,
        ]);
    }

    public function expireCheck($gymId)
    {
        $count = GymMembership::where('gym_id', $gymId)
            ->where('status', 'active')
            ->whereNotNull('end_date')
            ->whereDate('end_date', '<', now()->toDateString())
            ->update([
                'status' => 'expired',
                'updated_at' => now(),
            ]);

        return response()->json([
            'message' => 'Expire check completed',
            'expired_count' => $count,
        ]);
    }
}