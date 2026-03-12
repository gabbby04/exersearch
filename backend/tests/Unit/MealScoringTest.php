<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class MealScoringTest extends TestCase
{
    private array $weights = [
        'calories' => 0.30,
        'protein'  => 0.30,
        'carbs'    => 0.15,
        'fats'     => 0.10,
        'cost'     => 0.15,
    ];

    private function scoreMeal(array $target, array $meal): float
    {
        $error = 0;
        foreach ($this->weights as $key => $weight) {
            if ($target[$key] > 0) {
                $error += $weight * abs($meal[$key] - $target[$key]) / $target[$key];
            }
        }
        return $error;
    }

    /** @test */
    public function perfect_meal_match_returns_zero_error()
    {
        $target = ['calories' => 600, 'protein' => 40, 'carbs' => 70, 'fats' => 15, 'cost' => 120];
        $meal   = ['calories' => 600, 'protein' => 40, 'carbs' => 70, 'fats' => 15, 'cost' => 120];

        $this->assertEqualsWithDelta(0.0, $this->scoreMeal($target, $meal), 0.0001);
    }

    /** @test */
    public function higher_deviation_produces_higher_error()
    {
        $target = ['calories' => 600, 'protein' => 40, 'carbs' => 70, 'fats' => 15, 'cost' => 120];
        $close  = ['calories' => 610, 'protein' => 41, 'carbs' => 72, 'fats' => 16, 'cost' => 125];
        $far    = ['calories' => 900, 'protein' => 10, 'carbs' => 30, 'fats' => 50, 'cost' => 250];

        $this->assertGreaterThan(
            $this->scoreMeal($target, $close),
            $this->scoreMeal($target, $far)
        );
    }

    /** @test */
    public function error_score_is_always_non_negative()
    {
        $target = ['calories' => 500, 'protein' => 30, 'carbs' => 60, 'fats' => 10, 'cost' => 100];
        $meal   = ['calories' => 300, 'protein' => 50, 'carbs' => 80, 'fats' => 5,  'cost' => 80];

        $this->assertGreaterThanOrEqual(0.0, $this->scoreMeal($target, $meal));
    }

    /** @test */
    public function scoring_weights_sum_to_one()
    {
        $this->assertEqualsWithDelta(1.0, array_sum($this->weights), 0.0001);
    }

    /** @test */
    public function calories_and_protein_carry_highest_weights()
    {
        $this->assertEquals($this->weights['calories'], $this->weights['protein']);
        $this->assertGreaterThan($this->weights['carbs'], $this->weights['calories']);
        $this->assertGreaterThan($this->weights['fats'],  $this->weights['calories']);
    }
}