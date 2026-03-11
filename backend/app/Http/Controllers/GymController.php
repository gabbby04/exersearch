<?php

namespace App\Http\Controllers;

use App\Models\Gym;
use App\Models\GymMembership;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; 
use App\Http\Resources\GymResource;
use App\Http\Resources\EquipmentResource;
use App\Http\Resources\AmenityResource;
use App\Services\NotificationService;

class GymController extends Controller
{
    public function index(Request $request)
    {
        $query = Gym::with(['owner', 'equipments', 'amenities'])
            ->where('status', 'approved');

        if ($request->has('gym_type')) $query->where('gym_type', $request->gym_type);
        if ($request->has('is_airconditioned')) $query->where('is_airconditioned', $request->is_airconditioned);
        if ($request->has('has_personal_trainers')) $query->where('has_personal_trainers', $request->has_personal_trainers);
        if ($request->has('has_classes')) $query->where('has_classes', $request->has_classes);
        if ($request->has('is_24_hours')) $query->where('is_24_hours', $request->is_24_hours);

        foreach (['daily_price', 'monthly_price', 'annual_price'] as $field) {
            if ($request->has($field)) $query->where($field, $request->get($field));
            if ($request->has("{$field}_min")) $query->where($field, '>=', $request->get("{$field}_min"));
            if ($request->has("{$field}_max")) $query->where($field, '<=', $request->get("{$field}_max"));
        }

        if ($request->has('amenity_id')) {
            $query->whereHas('amenities', fn ($q) => $q->where('amenity_id', $request->amenity_id));
        }

        if ($request->has('equipment_category')) {
            $query->whereHas('equipments', fn ($q) => $q->where('category', $request->equipment_category));
        }
        if ($request->has('equipment_difficulty')) {
            $query->whereHas('equipments', fn ($q) => $q->where('difficulty', $request->equipment_difficulty));
        }

        $perPage = max(1, min((int) $request->query('per_page', 10), 200));
        return GymResource::collection($query->paginate($perPage));
    }

    public function show($gym_id)
    {
        $gym = Gym::with(['equipments', 'amenities', 'owner'])
            ->where('status', 'approved')
            ->findOrFail($gym_id);

        return new GymResource($gym);
    }

    public function equipments(Request $request, $gym_id)
    {
        $gym = Gym::where('status', 'approved')->findOrFail($gym_id);
        $query = $gym->equipments();

        if ($request->has('category')) $query->where('category', $request->category);
        if ($request->has('difficulty')) $query->where('difficulty', $request->difficulty);

        $perPage = max(1, min((int) $request->query('per_page', 10), 200));
        return EquipmentResource::collection($query->paginate($perPage));
    }

    public function equipmentDetail($gym_id, $equipment_id)
    {
        $gym = Gym::where('status', 'approved')->findOrFail($gym_id);
        $equipment = $gym->equipments()
            ->where('equipments.equipment_id', $equipment_id)
            ->firstOrFail();

        return new EquipmentResource($equipment);
    }

    public function amenities(Request $request, $gym_id)
    {
        $gym = Gym::where('status', 'approved')->findOrFail($gym_id);
        $query = $gym->amenities();

        if ($request->has('available')) {
            $query->wherePivot('availability_status', $request->available);
        }

        $perPage = max(1, min((int) $request->query('per_page', 10), 200));
        return AmenityResource::collection($query->paginate($perPage));
    }

    public function amenityDetail($gym_id, $amenity_id)
    {
        $gym = Gym::where('status', 'approved')->findOrFail($gym_id);
        $amenity = $gym->amenities()
            ->where('amenities.amenity_id', $amenity_id)
            ->firstOrFail();

        return new AmenityResource($amenity);
    }

    public function myGyms(Request $request)
    {
        $user = auth()->user();
        if (!$user || !in_array($user->role, ['owner', 'superadmin'])) abort(403, 'Unauthorized');

        $query = Gym::with(['owner', 'equipments', 'amenities']);
        if ($user->role !== 'superadmin') $query->where('owner_id', $user->user_id);

        $perPage = max(1, min((int) $request->query('per_page', 20), 200));
        return GymResource::collection($query->orderByDesc('created_at')->paginate($perPage));
    }

    public function adminIndex(Request $request)
    {
        $user = auth()->user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) abort(403, 'Unauthorized');

        $perPage = max(1, min((int) $request->query('per_page', 20), 200));
        $q = trim((string) $request->query('q', ''));
        $status = $request->query('status');

        $query = Gym::with(['owner', 'equipments', 'amenities'])
            ->when($q !== '', function ($qq) use ($q) {
                $qq->where(function ($w) use ($q) {
                    $w->where('name', 'ilike', "%{$q}%")
                        ->orWhere('address', 'ilike', "%{$q}%")
                        ->orWhere('gym_type', 'ilike', "%{$q}%");
                });
            })
            ->when($status, fn ($qq) => $qq->where('status', $status))
            ->orderByDesc('created_at');

        return GymResource::collection($query->paginate($perPage));
    }

    public function adminShow($gym_id)
    {
        $user = auth()->user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) abort(403, 'Unauthorized');

        $gym = Gym::with(['owner', 'equipments', 'amenities'])->findOrFail($gym_id);
        return new GymResource($gym);
    }

    public function adminApprove($gym_id)
    {
        $user = auth()->user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) abort(403, 'Unauthorized');

        $gym = Gym::with(['owner'])->findOrFail($gym_id);

        $gym->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by' => $user->user_id,
        ]);

        if (!empty($gym->owner_id)) {
            NotificationService::create([
                'recipient_id' => (int) $gym->owner_id,
                'recipient_role' => 'owner',
                'type' => 'GYM_APPROVED',
                'title' => 'Gym approved',
                'message' => '"' . ($gym->name ?? 'Your gym') . '" was approved by admin.',
                'gym_id' => (int) $gym->gym_id,
                'actor_id' => (int) $user->user_id,
                'url' => '/owner/my-gyms',
                'meta' => ['status' => 'approved'],
            ]);
        }

        return response()->json([
            'message' => 'Gym approved successfully.',
            'data' => new GymResource($gym->load(['owner', 'equipments', 'amenities'])),
        ]);
    }

    public function adminReject(Request $request, $gym_id)
    {
        $user = auth()->user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) abort(403, 'Unauthorized');

        $gym = Gym::with(['owner'])->findOrFail($gym_id);
        $reason = trim((string) $request->input('reason', ''));

        $gym->update([
            'status' => 'rejected',
            'approved_at' => null,
            'approved_by' => null,
        ]);

        if (!empty($gym->owner_id)) {
            NotificationService::create([
                'recipient_id' => (int) $gym->owner_id,
                'recipient_role' => 'owner',
                'type' => 'GYM_REJECTED',
                'title' => 'Gym rejected',
                'message' => '"' . ($gym->name ?? 'Your gym') . '" was rejected by admin.' . ($reason ? " Reason: {$reason}" : ''),
                'gym_id' => (int) $gym->gym_id,
                'actor_id' => (int) $user->user_id,
                'url' => '/owner/my-gyms',
                'meta' => ['status' => 'rejected', 'reason' => $reason ?: null],
            ]);
        }

        return response()->json([
            'message' => 'Gym rejected.',
            'data' => new GymResource($gym->load(['owner', 'equipments', 'amenities'])),
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        if (!$user || !in_array($user->role, ['owner', 'superadmin'])) abort(403, 'Unauthorized');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'address' => 'required|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'daily_price' => 'nullable|numeric|min:0',
            'monthly_price' => 'required|numeric|min:0',
            'annual_price' => 'nullable|numeric|min:0',
            'opening_time' => 'nullable',
            'closing_time' => 'nullable',
            'gym_type' => 'nullable|string|max:50',
            'contact_number' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:255',
            'facebook_page' => 'nullable|url|max:255',
            'instagram_page' => 'nullable|url|max:255',
            'main_image_url' => 'nullable|string',
            'gallery_urls' => 'nullable|array',
            'gallery_urls.*' => 'nullable|string',
            'has_personal_trainers' => 'boolean',
            'has_classes' => 'boolean',
            'is_24_hours' => 'boolean',
            'is_airconditioned' => 'boolean',
        ]);

        $validated['owner_id'] = $user->user_id;

        if ($user->role !== 'superadmin') {
            $validated['status'] = 'pending';
            $validated['approved_at'] = null;
            $validated['approved_by'] = null;
        } else {
            $validated['status'] = 'approved';
            $validated['approved_at'] = now();
            $validated['approved_by'] = $user->user_id;
        }

        $gym = Gym::create($validated);

        if ($user->role !== 'superadmin') {
            NotificationService::notifyAdmins(
                'GYM_SUBMITTED',
                'New gym submitted',
                'Gym "' . ($gym->name ?? 'New gym') . '" was submitted for approval.',
                [
                    'gym_id' => $gym->gym_id,
                    'actor_id' => $user->user_id,
                    'url' => '/admin/gym-application',
                    'meta' => ['status' => $gym->status],
                ]
            );
        }

        return response()->json([
            'message' => 'Gym created.',
            'data' => new GymResource($gym->load(['owner', 'equipments', 'amenities'])),
        ], 201);
    }

    public function update(Request $request, $gym_id)
    {
        $user = auth()->user();
        if (!$user || !in_array($user->role, ['owner', 'superadmin'])) abort(403, 'Unauthorized');

        $query = Gym::where('gym_id', $gym_id);
        if ($user->role !== 'superadmin') $query->where('owner_id', $user->user_id);

        $gym = $query->firstOrFail();

        $before = [
            'opening_time' => (string) ($gym->opening_time ?? ''),
            'closing_time' => (string) ($gym->closing_time ?? ''),
            'is_24_hours'  => (bool) ($gym->is_24_hours ?? false),
        ];

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'address' => 'required|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'contact_number' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:255',
            'facebook_page' => 'nullable|url|max:255',
            'instagram_page' => 'nullable|url|max:255',
            'daily_price' => 'nullable|numeric|min:0',
            'monthly_price' => 'required|numeric|min:0',
            'annual_price' => 'nullable|numeric|min:0',
            'opening_time' => 'nullable',
            'closing_time' => 'nullable',
            'gym_type' => 'nullable|string|max:50',
            'main_image_url' => 'nullable|string',
            'gallery_urls' => 'nullable|array',
            'gallery_urls.*' => 'nullable|string',
            'has_personal_trainers' => 'boolean',
            'has_classes' => 'boolean',
            'is_24_hours' => 'boolean',
            'is_airconditioned' => 'boolean',
        ]);

        $gym->update($validated);

        $after = [
            'opening_time' => (string) ($gym->opening_time ?? ''),
            'closing_time' => (string) ($gym->closing_time ?? ''),
            'is_24_hours'  => (bool) ($gym->is_24_hours ?? false),
        ];

        $scheduleChanged = $before !== $after;

        if ($scheduleChanged) {
            $memberIds = GymMembership::query()
                ->where('gym_id', (int) $gym->gym_id)
                ->where('status', 'active')
                ->pluck('user_id')
                ->unique()
                ->values()
                ->all();

            if (!empty($memberIds)) {
                $rows = [];
                foreach ($memberIds as $uid) {
                    $rows[] = [
                        'recipient_id' => (int) $uid,
                        'recipient_role' => 'user',
                        'type' => 'GYM_SCHEDULE_UPDATED',
                        'title' => 'Gym schedule updated',
                        'message' => '"' . ($gym->name ?? 'Your gym') . '" updated its schedule.',
                        'gym_id' => (int) $gym->gym_id,
                        'actor_id' => (int) $user->user_id,
                        'url' => '/home/gym/' . (int) $gym->gym_id,
                        'meta' => [
                            'before' => $before,
                            'after' => $after,
                        ],
                    ];
                }
                NotificationService::bulkInsert($rows);
            }
        }

        return response()->json([
            'message' => 'Gym updated.',
            'data' => new GymResource($gym->load(['owner', 'equipments', 'amenities'])),
        ]);
    }

    public function destroy($gym_id)
    {
        $user = auth()->user();
        if (!$user || !in_array($user->role, ['owner', 'superadmin'])) abort(403, 'Unauthorized');

        $query = Gym::where('gym_id', $gym_id);
        if ($user->role !== 'superadmin') $query->where('owner_id', $user->user_id);

        $gym = $query->firstOrFail();
        $gym->delete();

        return response()->json(['message' => 'Gym deleted.']);
    }

    public function mapGyms(Request $request)
    {
        $validated = $request->validate([
            'south' => 'required|numeric',
            'west'  => 'required|numeric',
            'north' => 'required|numeric',
            'east'  => 'required|numeric',
        ]);

        $rows = Gym::query()
            ->select(['gym_id', 'name', 'address', 'latitude', 'longitude', 'owner_id'])
            ->where('status', 'approved')
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->whereBetween('latitude', [$validated['south'], $validated['north']])
            ->whereBetween('longitude', [$validated['west'], $validated['east']])
            ->orderBy('name')
            ->get();

        return response()->json([
            'meta' => ['count' => $rows->count(), 'bbox' => $validated],
            'data' => $rows,
        ]);
    }
}