<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::create('meals', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->enum('meal_type', ['breakfast','lunch','dinner','snack']);
        $table->integer('calories');
        $table->decimal('protein', 5, 2);
        $table->decimal('carbs', 5, 2);
        $table->decimal('fats', 5, 2);
        $table->decimal('estimated_cost', 6, 2);
        $table->json('diet_tags')->nullable();
        $table->json('allergens')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
    });
}

    public function down(): void
    {
        Schema::dropIfExists('meals');
    }
};
