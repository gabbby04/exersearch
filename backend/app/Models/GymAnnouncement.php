<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GymAnnouncement extends Model
{
    protected $table = 'gym_announcements';
    protected $primaryKey = 'announcement_id';

    protected $fillable = [
        'gym_id',
        'owner_id',
        'title',
        'body',
        'meta',
        'is_deleted',
        'deleted_by',
        'deleted_at',
    ];

    protected $casts = [
        'gym_id' => 'integer',
        'owner_id' => 'integer',
        'is_deleted' => 'boolean',
        'deleted_by' => 'integer',
        'deleted_at' => 'datetime',
        'meta' => 'array',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id', 'gym_id');
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id', 'user_id');
    }
}