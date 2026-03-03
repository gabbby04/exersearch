<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GymMembership extends Model
{
    protected $table = 'gym_memberships';
    protected $primaryKey = 'membership_id';

    protected $fillable = [
        'gym_id',
        'user_id',
        'status',
        'start_date',
        'end_date',
        'activated_at',
        'expiry_notified_at',
        'cancelled_at',
        'plan_type',
        'notes',
    ];

    protected $casts = [
        'start_date'    => 'date',
        'end_date'      => 'date',
        'activated_at'  => 'datetime',
        'cancelled_at'  => 'datetime',
        'created_at'    => 'datetime',
        'expiry_notified_at' => 'datetime',
        'updated_at'    => 'datetime',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id', 'gym_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}