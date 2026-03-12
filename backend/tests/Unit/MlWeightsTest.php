<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class MlWeightsTest extends TestCase
{
    private function normalizeCoefficients(array $coefficients): array
    {
        $abs = array_map('abs', $coefficients);
        $sum = array_sum($abs);
        return $sum > 0
            ? array_map(fn($v) => $v / $sum, $abs)
            : array_fill(0, count($abs), 1 / count($abs));
    }

    private function exponentialSmooth(array $newWeights, array $oldWeights, float $alpha = 0.35): array
    {
        $result = [];
        foreach ($newWeights as $i => $new) {
            $result[$i] = $alpha * $new + (1 - $alpha) * ($oldWeights[$i] ?? $new);
        }
        return $result;
    }

    /** @test */
    public function normalized_weights_sum_to_one()
    {
        $coefficients = [1.5, -0.8, 2.1, 0.4];
        $weights      = $this->normalizeCoefficients($coefficients);

        $this->assertEqualsWithDelta(1.0, array_sum($weights), 0.0001);
    }

    /** @test */
    public function normalized_weights_are_all_positive()
    {
        $coefficients = [1.5, -0.8, 2.1, -0.4];
        $weights      = $this->normalizeCoefficients($coefficients);

        foreach ($weights as $w) {
            $this->assertGreaterThanOrEqual(0.0, $w);
        }
    }

    /** @test */
    public function exponential_smoothing_blends_old_and_new()
    {
        $old      = [0.35, 0.25, 0.25, 0.15];
        $new      = [0.10, 0.40, 0.30, 0.20];
        $smoothed = $this->exponentialSmooth($new, $old, 0.35);

        for ($i = 0; $i < count($smoothed); $i++) {
            $this->assertGreaterThanOrEqual(min($old[$i], $new[$i]) - 0.001, $smoothed[$i]);
            $this->assertLessThanOrEqual(max($old[$i], $new[$i]) + 0.001, $smoothed[$i]);
        }
    }

    /** @test */
    public function smoothed_weights_still_sum_to_one()
    {
        $old      = [0.35, 0.25, 0.25, 0.15];
        $new      = [0.20, 0.30, 0.30, 0.20];
        $smoothed = $this->exponentialSmooth($new, $old);

        $this->assertEqualsWithDelta(1.0, array_sum($smoothed), 0.001);
    }

    /** @test */
    public function zero_coefficients_return_uniform_weights()
    {
        $coefficients = [0.0, 0.0, 0.0, 0.0];
        $weights      = $this->normalizeCoefficients($coefficients);

        foreach ($weights as $w) {
            $this->assertEqualsWithDelta(0.25, $w, 0.0001);
        }
    }
}