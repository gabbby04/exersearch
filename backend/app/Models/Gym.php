<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class Gym extends Model
{
    protected $table = 'gyms';
    protected $primaryKey = 'gym_id';

    protected $fillable = [
        'name',
        'description',
        'owner_id',
        'address',
        'latitude',
        'longitude',
        'daily_price',
        'monthly_price',
        'annual_price',
        'opening_time',
        'closing_time',
        'gym_type',
        'equipment_score',
        'contact_number',
        'email',
        'website',
        'facebook_page',
        'instagram_page',
        'main_image_url',
        'gallery_urls',
        'has_personal_trainers',
        'has_classes',
        'is_24_hours',
        'is_airconditioned',
        'free_first_visit_enabled',
        'free_first_visit_enabled_at',
    ];

    protected $casts = [
        'latitude' => 'decimal:6',
        'longitude' => 'decimal:6',
        'daily_price' => 'decimal:2',
        'monthly_price' => 'decimal:2',
        'annual_price' => 'decimal:2',
        'gallery_urls' => 'array',
        'has_personal_trainers' => 'boolean',
        'has_classes' => 'boolean',
        'is_24_hours' => 'boolean',
        'is_airconditioned' => 'boolean',
        'free_first_visit_enabled' => 'boolean',
        'free_first_visit_enabled_at' => 'datetime',
        'opening_time' => 'datetime:H:i',
        'closing_time' => 'datetime:H:i',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id')
            ->where('role', 'owner');
    }

    public function ownerProfile()
    {
        return $this->hasOneThrough(
            OwnerProfile::class,
            User::class,
            'user_id',
            'user_id',
            'owner_id',
            'user_id'
        );
    }

    public function gymEquipments()
    {
        return $this->hasMany(GymEquipment::class, 'gym_id', 'gym_id');
    }

    public function equipments()
    {
        return $this->belongsToMany(
            Equipment::class,
            'gym_equipments',
            'gym_id',
            'equipment_id'
        )->withPivot([
            'id',
            'quantity',
            'status',
            'date_purchased',
            'last_maintenance',
            'next_maintenance'
        ]);
    }

    public function gymAmenities()
    {
        return $this->hasMany(GymAmenity::class, 'gym_id', 'gym_id');
    }

    public function amenities()
    {
        return $this->belongsToMany(
            Amenity::class,
            'gym_amenities',
            'gym_id',
            'amenity_id'
        )->withPivot([
            'id',
            'availability_status',
            'notes',
            'image_url'
        ]);
    }

    public function withinBudget($budget)
    {
        return $this->daily_price <= $budget
            || $this->monthly_price <= $budget;
    }

    public function equipmentMatchPercentage(array $requiredEquipmentIds)
    {
        if (count($requiredEquipmentIds) === 0) {
            return 100;
        }

        $gymEquipmentIds = $this->equipments()->pluck('equipments.id')->toArray();
        $matched = array_intersect($requiredEquipmentIds, $gymEquipmentIds);

        return round((count($matched) / count($requiredEquipmentIds)) * 100);
    }

    public function fitRankScore(array $userPreferences)
    {
        $score = 0;

        if ($this->withinBudget($userPreferences['budget'] ?? 0)) {
            $score += 30;
        }

        if (!empty($userPreferences['equipment_ids'])) {
            $score += $this->equipmentMatchPercentage(
                $userPreferences['equipment_ids']
            ) * 0.5;
        }

        if ($this->has_personal_trainers) $score += 5;
        if ($this->has_classes) $score += 5;
        if ($this->is_airconditioned) $score += 5;

        return min(100, round($score));
    }

    public function savedBy()
    {
        return $this->hasMany(\App\Models\SavedGym::class, 'gym_id', 'gym_id');
    }

    public function memberships()
    {
        return $this->hasMany(\App\Models\GymMembership::class, 'gym_id', 'gym_id');
    }

    public function freeVisits()
    {
        return $this->hasMany(\App\Models\GymFreeVisit::class, 'gym_id', 'gym_id');
    }

    public function inquiries()
    {
        return $this->hasMany(\App\Models\GymInquiry::class, 'gym_id', 'gym_id');
    }

    public function ratings()
    {
        return $this->hasMany(\App\Models\GymRating::class, 'gym_id', 'gym_id');
    }
}