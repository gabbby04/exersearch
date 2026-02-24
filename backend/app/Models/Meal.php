<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Meal extends Model
{
    protected $fillable = [
        'name',
        'meal_type',
        'calories',
        'protein',
        'carbs',
        'fats',
        'estimated_cost',
        'diet_tags',
        'allergens',
        'is_active'
    ];

    protected $casts = [
        'diet_tags' => 'array',
        'allergens' => 'array',
        'is_active' => 'boolean'
    ];
}
