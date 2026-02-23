<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GymInquiry extends Model
{
    protected $table = 'gym_inquiries';
    protected $primaryKey = 'inquiry_id';

    protected $fillable = [
        'gym_id',
        'user_id',
        'status',
        'question',
        'answer',
        'answered_at',
        'answered_by_owner_id',
    ];

    protected $casts = [
        'answered_at' => 'datetime',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id', 'gym_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function answeredByOwner()
    {
        return $this->belongsTo(User::class, 'answered_by_owner_id', 'user_id');
    }
}