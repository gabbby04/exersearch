<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class WorkoutSplitTest extends TestCase
{
    private function determineSplit(int $daysPerWeek): string
    {
        if ($daysPerWeek <= 3) return 'full_body';
        if ($daysPerWeek === 4) return 'upper_lower';
        return 'ppl';
    }

    /** @test */
    public function one_day_per_week_returns_full_body()
    {
        $this->assertEquals('full_body', $this->determineSplit(1));
    }

    /** @test */
    public function two_days_per_week_returns_full_body()
    {
        $this->assertEquals('full_body', $this->determineSplit(2));
    }

    /** @test */
    public function three_days_per_week_returns_full_body()
    {
        $this->assertEquals('full_body', $this->determineSplit(3));
    }

    /** @test */
    public function four_days_per_week_returns_upper_lower()
    {
        $this->assertEquals('upper_lower', $this->determineSplit(4));
    }

    /** @test */
    public function five_days_per_week_returns_ppl()
    {
        $this->assertEquals('ppl', $this->determineSplit(5));
    }

    /** @test */
    public function six_days_per_week_returns_ppl()
    {
        $this->assertEquals('ppl', $this->determineSplit(6));
    }
}