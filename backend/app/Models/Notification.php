<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $table = 'notifications';
    protected $primaryKey = 'notification_id';

    public $timestamps = false; // we manage created_at/read_at ourselves

    protected $fillable = [
        'recipient_id',
        'recipient_role',
        'type',
        'title',
        'message',
        'url',
        'gym_id',
        'actor_id',
        'meta',
        'is_read',
        'created_at',
        'read_at',
    ];

    protected $casts = [
        'recipient_id' => 'integer',
        'gym_id' => 'integer',
        'actor_id' => 'integer',
        'is_read' => 'boolean',
        'meta' => 'array',
        'created_at' => 'datetime',
        'read_at' => 'datetime',
    ];
}