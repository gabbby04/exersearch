<?php

namespace App\Http\Controllers;

use App\Mail\OwnerApplicationApproved;
use App\Mail\OwnerApplicationRejected;
use App\Models\GymOwnerApplication;
use App\Models\Gym;
use App\Models\OwnerProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Services\NotificationService;

class GymOwnerApplicationController extends Controller
{
    public function applyOrUpdate(Request $request)
    {
        $data = $request->validate([
            'gym_name'  => 'required|string|max:255',
            'address'   => 'required|string',
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',

            'existing_gym_id' => 'nullable|integer|exists:gyms,gym_id',

            'document_path' => 'nullable|string|max:2048',
            'main_image_url' => 'nullable|string|max:2048',
            'gallery_urls' => 'nullable|array',
            'gallery_urls.*' => 'string|max:2048',
            'description' => 'nullable|string',
            'contact_number' => 'nullable|string|max:50',
            'company_name' => 'nullable|string|max:255',
            'daily_price' => 'nullable|numeric|min:0',
            'monthly_price' => 'nullable|numeric|min:0',
            'quarterly_price' => 'nullable|numeric|min:0',
            'amenity_ids' => 'nullable|array',
            'amenity_ids.*' => 'integer|min:1',
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if ($user->role !== 'user') {
            return response()->json(['message' => 'Not allowed'], 403);
        }

        if (!empty($data['existing_gym_id'])) {
            $existingGym = Gym::find($data['existing_gym_id']);

            if (!$existingGym) {
                return response()->json(['message' => 'Selected gym not found.'], 422);
            }

            if (!empty($existingGym->owner_id) && (int) $existingGym->owner_id !== (int) $user->user_id) {
                return response()->json(['message' => 'This gym already has an owner.'], 422);
            }
        }

        $application = GymOwnerApplication::where('user_id', $user->user_id)->first();

        $payload = [
            'gym_name'  => $data['gym_name'],
            'address'   => $data['address'],
            'latitude'  => $data['latitude'],
            'longitude' => $data['longitude'],
            'status'    => 'pending',
            'existing_gym_id' => $data['existing_gym_id'] ?? null,

            'document_path' => $data['document_path'] ?? ($application?->document_path),
            'main_image_url' => array_key_exists('main_image_url', $data)
                ? $data['main_image_url']
                : ($application?->main_image_url),

            'gallery_urls' => array_key_exists('gallery_urls', $data)
                ? array_values(array_filter($data['gallery_urls'] ?? []))
                : ($application?->gallery_urls),

            'description' => array_key_exists('description', $data)
                ? $data['description']
                : ($application?->description),

            'contact_number' => array_key_exists('contact_number', $data)
                ? $data['contact_number']
                : ($application?->contact_number),

            'company_name' => array_key_exists('company_name', $data)
                ? $data['company_name']
                : ($application?->company_name),

            'daily_price' => array_key_exists('daily_price', $data)
                ? $data['daily_price']
                : ($application?->daily_price),

            'monthly_price' => array_key_exists('monthly_price', $data)
                ? $data['monthly_price']
                : ($application?->monthly_price),

            'quarterly_price' => array_key_exists('quarterly_price', $data)
                ? $data['quarterly_price']
                : ($application?->quarterly_price),
        ];

        if (array_key_exists('amenity_ids', $data)) {
            $payload['amenity_ids'] = array_values(
                array_unique(array_map('intval', $data['amenity_ids'] ?? []))
            );
        } else {
            $payload['amenity_ids'] = $application?->amenity_ids;
        }

        if ($application) {
            $application->update($payload);

            NotificationService::notifyAdmins(
                'OWNER_REQUEST_SUBMITTED',
                'Owner application updated',
                ($user->name ?? 'A user') . ' updated an owner application for "' . ($payload['gym_name'] ?? 'a gym') . '".',
                [
                    'actor_id' => (int) $user->user_id,
                    'url' => '/admin/applications',
                    'meta' => [
                        'application_id' => (int) $application->id,
                        'existing_gym_id' => $payload['existing_gym_id'] ?? null,
                    ],
                ]
            );

            return response()->json([
                'message' => 'Application updated.',
                'data' => $application->fresh(),
            ]);
        }

        $payload['user_id'] = $user->user_id;
        $application = GymOwnerApplication::create($payload);

        NotificationService::notifyAdmins(
            'OWNER_REQUEST_SUBMITTED',
            'New owner application',
            ($user->name ?? 'A user') . ' requested to become an owner for "' . ($application->gym_name ?? 'a gym') . '".',
            [
                'actor_id' => (int) $user->user_id,
                'url' => '/admin/applications',
                'meta' => [
                    'application_id' => (int) $application->id,
                    'existing_gym_id' => $application->existing_gym_id ?? null,
                ],
            ]
        );

        return response()->json([
            'message' => 'Application submitted.',
            'data' => $application,
        ], 201);
    }

    public function myApplication(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $application = GymOwnerApplication::where('user_id', $user->user_id)->first();

        return response()->json(['data' => $application]);
    }

    public function index(Request $request)
    {
        $status = $request->query('status');
        $q = $request->query('q');

        $apps = GymOwnerApplication::with(['user', 'existingGym'])
            ->when($status, fn ($query) => $query->where('status', $status))
            ->when($q, function ($query) use ($q) {
                $query->where(function ($qq) use ($q) {
                    $qq->where('gym_name', 'ilike', "%{$q}%")
                        ->orWhere('address', 'ilike', "%{$q}%");
                });
            })
            ->orderByDesc('created_at')
            ->paginate((int) $request->query('per_page', 20));

        return response()->json($apps);
    }

    public function show($id)
    {
        $application = GymOwnerApplication::with(['user', 'existingGym'])->findOrFail($id);
        return response()->json(['data' => $application]);
    }

    public function mapPoints(Request $request)
    {
        $validated = $request->validate([
            'south' => 'required|numeric',
            'west'  => 'required|numeric',
            'north' => 'required|numeric',
            'east'  => 'required|numeric',
            'status' => 'nullable|string|in:pending,approved,rejected',
        ]);

        $apps = GymOwnerApplication::query()
            ->select([
                'id',
                'user_id',
                'existing_gym_id',
                'gym_name',
                'address',
                'status',
                'latitude',
                'longitude',
                'created_at'
            ])
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->whereBetween('latitude', [$validated['south'], $validated['north']])
            ->whereBetween('longitude', [$validated['west'], $validated['east']])
            ->when(empty($validated['status']), fn ($q) => $q->where('status', 'pending'))
            ->when(!empty($validated['status']), fn ($q) => $q->where('status', $validated['status']))
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $apps]);
    }

    public function approve($id)
    {
        $mailTo = null;
        $mailName = 'Applicant';
        $mailGym = 'Your Gym';
        $approverId = auth()->user()?->user_id;
        $recipientUserId = null;
        $applicationId = (int) $id;

        DB::transaction(function () use ($id, &$mailTo, &$mailName, &$mailGym, $approverId, &$recipientUserId) {
            $application = GymOwnerApplication::with(['user', 'existingGym'])
                ->where('id', $id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($application->status === 'approved') {
                abort(409, 'Already approved');
            }

            if ($application->status === 'rejected') {
                abort(409, 'Cannot approve a rejected application');
            }

            $gym = null;

            if (!empty($application->existing_gym_id)) {
                $gym = Gym::where('gym_id', $application->existing_gym_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if (!empty($gym->owner_id) && (int) $gym->owner_id !== (int) $application->user_id) {
                    abort(409, 'This gym already has an owner.');
                }
            }

            $application->update(['status' => 'approved']);
            $application->user->update(['role' => 'owner']);

            OwnerProfile::updateOrCreate(
                ['user_id' => $application->user_id],
                [
                    'contact_number' => $application->contact_number ?? null,
                    'address' => $application->address ?? null,
                    'company_name' => $application->company_name ?? null,
                    'verified' => true,
                ]
            );

            $gymPayload = [
                'name' => $application->gym_name,
                'description' => $application->description ?? null,
                'owner_id' => $application->user_id,
                'address' => $application->address,
                'latitude' => $application->latitude,
                'longitude' => $application->longitude,
                'daily_price' => $application->daily_price ?? null,
                'monthly_price' => $application->monthly_price ?? 0.00,
                'annual_price' => $application->quarterly_price ?? null,
                'main_image_url' => $application->main_image_url ?? null,
                'gallery_urls' => $application->gallery_urls ?? [],
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by' => $approverId,
            ];

            if ($gym) {
                $gym->update(array_merge($gymPayload, [
                    'gym_type' => $gym->gym_type ?? 'General',
                    'has_personal_trainers' => $gym->has_personal_trainers ?? false,
                    'has_classes' => $gym->has_classes ?? false,
                    'is_24_hours' => $gym->is_24_hours ?? false,
                    'is_airconditioned' => $gym->is_airconditioned ?? true,
                    'contact_number' => $gym->contact_number ?? $application->contact_number ?? null,
                ]));
            } else {
                $gym = Gym::create(array_merge($gymPayload, [
                    'opening_time' => null,
                    'closing_time' => null,
                    'gym_type' => 'General',
                    'contact_number' => $application->contact_number ?? null,
                    'email' => null,
                    'website' => null,
                    'facebook_page' => null,
                    'instagram_page' => null,
                    'has_personal_trainers' => false,
                    'has_classes' => false,
                    'is_24_hours' => false,
                    'is_airconditioned' => true,
                ]));
            }

            $amenityIds = $application->amenity_ids ?? [];
            $amenityIds = array_values(
                array_unique(
                    array_filter(
                        array_map('intval', (array) $amenityIds)
                    )
                )
            );

            $syncPayload = [];
            foreach ($amenityIds as $aid) {
                $syncPayload[$aid] = [
                    'availability_status' => 'available',
                    'notes' => null,
                    'image_url' => null,
                ];
            }

            $gym->amenities()->sync($syncPayload);

            $mailTo = $application->user?->email;
            $mailName = $application->user?->name ?? 'Applicant';
            $mailGym = $application->gym_name ?? 'Your Gym';
            $recipientUserId = (int) $application->user_id;
        });

        if ($recipientUserId) {
            NotificationService::create([
                'recipient_id' => (int) $recipientUserId,
                'recipient_role' => 'user',
                'type' => 'OWNER_REQUEST_APPROVED',
                'title' => 'Owner application approved',
                'message' => 'Your request to become an owner for "' . ($mailGym ?? 'your gym') . '" was approved.',
                'actor_id' => (int) ($approverId ?? 0),
                'url' => '/home',
                'meta' => [
                    'application_id' => (int) $applicationId,
                    'gym_name' => $mailGym,
                ],
            ]);

            NotificationService::create([
                'recipient_id' => (int) $recipientUserId,
                'recipient_role' => 'owner',
                'type' => 'OWNER_WELCOME',
                'title' => 'Welcome, owner!',
                'message' => 'Your owner access is ready. Manage "' . ($mailGym ?? 'your gym') . '" from your dashboard.',
                'actor_id' => (int) ($approverId ?? 0),
                'url' => '/owner',
                'meta' => [
                    'application_id' => (int) $applicationId,
                    'gym_name' => $mailGym,
                ],
            ]);
        }

        if ($mailTo) {
            DB::afterCommit(function () use ($mailTo, $mailName, $mailGym) {
                try {
                    Mail::to($mailTo)->send(new OwnerApplicationApproved(
                        name: $mailName,
                        gymName: $mailGym
                    ));
                } catch (\Throwable $e) {
                    Log::warning('Approval email failed: ' . $e->getMessage());
                }
            });
        }

        return response()->json([
            'message' => 'Approved. Owner upgraded and gym assigned/populated successfully.'
        ]);
    }

    public function reject(Request $request, $id)
    {
        $request->validate([
            'reason' => 'nullable|string|max:500'
        ]);

        $application = GymOwnerApplication::with('user')->findOrFail($id);

        if ($application->status === 'rejected') {
            return response()->json(['message' => 'Already rejected'], 409);
        }

        if ($application->status === 'approved') {
            return response()->json(['message' => 'Cannot reject an approved application'], 409);
        }

        $application->update(['status' => 'rejected']);

        NotificationService::create([
            'recipient_id' => (int) $application->user_id,
            'recipient_role' => 'user',
            'type' => 'OWNER_REQUEST_REJECTED',
            'title' => 'Owner application rejected',
            'message' => 'Your request to become an owner for "' . ($application->gym_name ?? 'your gym') . '" was rejected.',
            'actor_id' => (int) (auth()->user()?->user_id ?? 0),
            'url' => '/home',
            'meta' => [
                'reason' => $request->input('reason'),
                'application_id' => (int) $application->id,
                'gym_name' => $application->gym_name,
            ],
        ]);

        $mailTo = $application->user?->email;
        $mailName = $application->user?->name ?? 'Applicant';
        $reason = $request->input('reason');

        if ($mailTo) {
            try {
                Mail::to($mailTo)->send(new OwnerApplicationRejected(
                    name: $mailName,
                    reason: $reason
                ));
            } catch (\Throwable $e) {
                Log::warning('Rejection email failed: ' . $e->getMessage());
            }
        }

        return response()->json(['message' => 'Rejected']);
    }
}