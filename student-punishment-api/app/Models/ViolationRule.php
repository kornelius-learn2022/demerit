<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ViolationRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'description',
        'point_deduction',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'point_deduction' => 'integer',
            'is_active'       => 'boolean',
        ];
    }

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function punishments(): HasMany
    {
        return $this->hasMany(Punishment::class);
    }
}
