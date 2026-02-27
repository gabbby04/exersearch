<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    protected $table = 'user_profiles';
    protected $primaryKey = 'profile_id';
    public $timestamps = true;

    protected $fillable = [
        'user_id',
        'age',
        'weight',
        'height',
        'address',
        'latitude',
        'longitude',

        'gender',

        'profile_photo_url',
    ];

    protected $casts = [
        'age' => 'integer',
        'weight' => 'float',
        'height' => 'float',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}
