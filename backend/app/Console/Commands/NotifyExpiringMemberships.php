<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\GymMembership;
use App\Services\NotificationService;
use Illuminate\Support\Carbon;

class NotifyExpiringMemberships extends Command
{
    protected $signature = 'memberships:notify-expiring {--days=3}';
    protected $description = 'Notify users whose memberships are expiring soon';

    public function handle()
    {
        $daysBefore = max(0, (int) $this->option('days'));

        $targetDate = Carbon::now()->addDays($daysBefore)->toDateString();

        $memberships = GymMembership::with('gym')
            ->where('status', 'active')
            ->whereNotNull('end_date')
            ->whereDate('end_date', $targetDate)
            ->whereNull('expiry_notified_at')
            ->get();

        if ($memberships->isEmpty()) {
            $this->info('No expiring memberships found.');
            return 0;
        }

        $rows = [];

        foreach ($memberships as $m) {
            $gymName = $m->gym->name ?? 'a gym';

            $rows[] = [
                'recipient_id' => (int) $m->user_id,
                'recipient_role' => 'user',
                'type' => 'MEMBERSHIP_EXPIRING',
                'title' => 'Membership expiring soon',
                'message' => 'Your membership at "' . $gymName . '" expires in ' . $daysBefore . ' day(s).',
                'gym_id' => (int) $m->gym_id,
                'actor_id' => null,
                'url' => '/home/memberships',
                'meta' => [
                    'membership_id' => (int) $m->membership_id,
                    'days_before' => $daysBefore,
                    'end_date' => (string) $m->end_date,
                ],
            ];
        }

        NotificationService::bulkInsert($rows);

        GymMembership::whereIn('membership_id', $memberships->pluck('membership_id')->all())
            ->update(['expiry_notified_at' => now()]);

        $this->info('Sent ' . count($rows) . ' membership expiring notifications.');
        return 0;
    }
}