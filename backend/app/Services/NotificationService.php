<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

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
'meta' => isset($data['meta']) ? json_encode($data['meta']) : null,
            'is_read'        => false,
            'created_at'     => now(),
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
'meta' => isset($r['meta']) ? json_encode($r['meta']) : null,                'is_read'        => false,
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
}