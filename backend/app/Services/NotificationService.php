<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use App\Models\Gym;
use Illuminate\Support\Facades\DB;

class NotificationService
{
    public static function create(array $data): Notification
    {
        return Notification::create([
            'recipient_id'   => (int) $data['recipient_id'],
            'recipient_role' => (string) $data['recipient_role'],
            'type'           => (string) $data['type'],
            'title'          => (string) $data['title'],
            'message'        => (string) $data['message'],
            'url'            => $data['url'] ?? null,
            'gym_id'         => $data['gym_id'] ?? null,
            'actor_id'       => $data['actor_id'] ?? null,
            'meta'           => isset($data['meta']) ? json_encode($data['meta']) : null,
            'is_read'        => false,
            'is_hidden'      => false,
            'created_at'     => now(),
            'read_at'        => null,
        ]);
    }

    public static function bulkInsert(array $rows): void
    {
        if (empty($rows)) return;

        $now = now();
        $payload = [];

        foreach ($rows as $r) {
            $payload[] = [
                'recipient_id'   => (int) $r['recipient_id'],
                'recipient_role' => (string) $r['recipient_role'],
                'type'           => (string) $r['type'],
                'title'          => (string) $r['title'],
                'message'        => (string) $r['message'],
                'url'            => $r['url'] ?? null,
                'gym_id'         => $r['gym_id'] ?? null,
                'actor_id'       => $r['actor_id'] ?? null,
                'meta'           => isset($r['meta']) ? json_encode($r['meta']) : null,
                'is_read'        => false,
                'is_hidden'      => false,
                'created_at'     => $now,
                'read_at'        => null,
            ];
        }

        Notification::insert($payload);
    }

    public static function notifyAdmins(string $type, string $title, string $message, array $extra = []): void
    {
        $adminIds = User::whereIn('role', ['admin', 'superadmin'])->pluck('user_id')->all();

        $rows = [];
        foreach ($adminIds as $adminId) {
            $rows[] = array_merge([
                'recipient_id' => (int) $adminId,
                'recipient_role' => 'admin',
                'type' => $type,
                'title' => $title,
                'message' => $message,
            ], $extra);
        }

        self::bulkInsert($rows);
    }

    public static function notifySavedUsersFreeVisitEnabled(Gym $gym, $actorUser, int $cooldownDays = 7): int
    {
        $userIds = DB::table('saved_gyms')
            ->where('gym_id', (int) $gym->gym_id)
            ->pluck('user_id')
            ->all();

        $recipientIds = array_values(array_unique(array_map('intval', $userIds)));

        if (empty($recipientIds)) {
            return 0;
        }

        $rows = [];
        foreach ($recipientIds as $uid) {
            $rows[] = [
                'recipient_id' => (int) $uid,
                'recipient_role' => 'user',
                'type' => 'FREE_VISIT_ENABLED',
                'title' => 'Free first visit available',
                'message' => '"' . ($gym->name ?? 'A gym you follow') . '" enabled free first visit.',
                'url' => '/home/gym/' . (int) $gym->gym_id,
                'gym_id' => (int) $gym->gym_id,
                'actor_id' => (int) $actorUser->user_id,
                'meta' => [
                    'gym_id' => (int) $gym->gym_id,
                    'kind' => 'free_visit_enabled',
                    'cooldown_days' => $cooldownDays,
                ],
            ];
        }

        self::bulkInsert($rows);

        return count($rows);
    }
}