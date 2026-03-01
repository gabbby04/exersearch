<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Faq extends Model
{
    protected $table = 'faqs';
    protected $primaryKey = 'faq_id';

    // Your table has created_at / updated_at columns
    public $timestamps = true;

    protected $fillable = [
        'question',
        'answer',
        'category',
        'display_order',
        'is_active',
    ];

    protected $casts = [
        'display_order' => 'integer',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}