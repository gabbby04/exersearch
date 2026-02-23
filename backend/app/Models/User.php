<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Contracts\Auth\MustVerifyEmail;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, Notifiable;

    protected $table = 'users';
    protected $primaryKey = 'user_id';
    public $timestamps = true;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'onboarded_at' => 'datetime',
    ];

    public function userProfile()
    {
        return $this->hasOne(UserProfile::class, 'user_id', 'user_id');
    }

    public function ownerProfile()
    {
        return $this->hasOne(OwnerProfile::class, 'user_id', 'user_id');
    }

    public function adminProfile()
    {
        return $this->hasOne(AdminProfile::class, 'user_id', 'user_id');
    }

    public function preference()
    {
        return $this->hasOne(UserPreference::class, 'user_id', 'user_id');
    }

    public function preferredAmenities()
    {
        return $this->belongsToMany(
            Amenity::class,
            'user_preferred_amenities',
            'user_id',
            'amenity_id'
        );
    }

    public function preferredEquipments()
    {
        return $this->belongsToMany(
            Equipment::class,
            'user_preferred_equipments',
            'user_id',
            'equipment_id'
        );
    }

    public function gyms()
    {
        return $this->hasMany(Gym::class, 'owner_id', 'user_id');
    }

    public function gymOwnerApplication()
    {
        return $this->hasOne(GymOwnerApplication::class, 'user_id', 'user_id');
    }

    public function isGymUser(): bool
    {
        return $this->role === 'user';
    }

    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['admin', 'superadmin']);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'superadmin';
    }

    public function savedGyms()
    {
        return $this->hasMany(\App\Models\SavedGym::class, 'user_id', 'user_id');
    }

    public function savedGymDetails()
    {
        return $this->belongsToMany(
            \App\Models\Gym::class,
            'saved_gyms',
            'user_id',
            'gym_id',
            'user_id',
            'gym_id'
        )->withTimestamps();
    }

    public function gymMemberships()
    {
        return $this->hasMany(\App\Models\GymMembership::class, 'user_id', 'user_id');
    }

    public function gymFreeVisits()
    {
        return $this->hasMany(\App\Models\GymFreeVisit::class, 'user_id', 'user_id');
    }

    public function gymInquiries()
    {
        return $this->hasMany(\App\Models\GymInquiry::class, 'user_id', 'user_id');
    }

    public function gymRatings()
    {
        return $this->hasMany(\App\Models\GymRating::class, 'user_id', 'user_id');
    }
}