<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GymFreeVisit extends Model
{
    protected $table = 'gym_free_visits';
    protected $primaryKey = 'free_visit_id';

    protected $fillable = [
        'gym_id',
        'user_id',
        'status',
        'claimed_at',
        'used_at',
        'used_by_owner_id',
        'cancelled_at',
        'expires_at',
    ];

    protected $casts = [
        'claimed_at'    => 'datetime',
        'used_at'       => 'datetime',
        'cancelled_at'  => 'datetime',
        'expires_at'    => 'datetime',
        'created_at'    => 'datetime',
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

    public function usedByOwner()
    {
        return $this->belongsTo(User::class, 'used_by_owner_id', 'user_id');
    }
}