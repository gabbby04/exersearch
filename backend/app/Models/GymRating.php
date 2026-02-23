<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GymRating extends Model
{
    protected $table = 'gym_ratings';
    protected $primaryKey = 'rating_id';

    protected $fillable = [
        'gym_id',
        'user_id',
        'stars',
        'review',
        'verified_via',
        'verified_ref_id',
    ];

    protected $casts = [
        'stars'         => 'integer',
        'verified_ref_id' => 'integer',
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
}