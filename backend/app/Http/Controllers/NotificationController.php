<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class NotificationController extends Controller
{
    private function roleForUser($user): string
    {
        $r = (string) ($user->role ?? 'user');
        if (in_array($r, ['owner', 'admin', 'superadmin', 'user'])) return $r;
        return 'user';
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $role = $this->roleForUser($user);

        $request->validate([
            'unread_only' => ['nullable', 'boolean'],
            'type' => ['nullable', 'string', 'max:80'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = Notification::query()
            ->where('recipient_id', (int) $user->user_id)
            ->where('recipient_role', $role);

        if ($request->boolean('unread_only')) $q->where('is_read', false);
        if ($request->filled('type')) $q->where('type', $request->query('type'));

        $perPage = (int) $request->query('per_page', 20);

        return response()->json(
            $q->orderByDesc('created_at')->paginate($perPage)
        );
    }

    public function unreadCount(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $role = $this->roleForUser($user);

        $count = Notification::query()
            ->where('recipient_id', (int) $user->user_id)
            ->where('recipient_role', $role)
            ->where('is_read', false)
            ->count();

        return response()->json(['unread' => (int) $count]);
    }

    public function markRead(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $role = $this->roleForUser($user);

        $n = Notification::query()
            ->where('notification_id', (int) $id)
            ->where('recipient_id', (int) $user->user_id)
            ->where('recipient_role', $role)
            ->first();

        if (!$n) return response()->json(['message' => 'Notification not found'], 404);

        if (!$n->is_read) {
            $n->update(['is_read' => true, 'read_at' => now()]);
        }

        return response()->json(['message' => 'Marked as read', 'notification' => $n->fresh()]);
    }

    public function markAllRead(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $role = $this->roleForUser($user);

        $count = Notification::query()
            ->where('recipient_id', (int) $user->user_id)
            ->where('recipient_role', $role)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['message' => 'All marked read', 'updated' => (int) $count]);
    }

    public function destroy(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $role = $this->roleForUser($user);

        $deleted = Notification::query()
            ->where('notification_id', (int) $id)
            ->where('recipient_id', (int) $user->user_id)
            ->where('recipient_role', $role)
            ->delete();

        return response()->json(['message' => $deleted ? 'Deleted' : 'Not found', 'deleted' => (int) $deleted]);
    }
}