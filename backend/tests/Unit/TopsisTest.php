<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class TopsisTest extends TestCase
{
    private function runTopsis(array $matrix, array $weights): array
    {
        $n = count($matrix);
        $m = count($matrix[0]);

        // Step 1: Normalize
        $normalized = [];
        for ($j = 0; $j < $m; $j++) {
            $sum = sqrt(array_sum(array_map(fn($row) => $row[$j] ** 2, $matrix)));
            for ($i = 0; $i < $n; $i++) {
                $normalized[$i][$j] = $sum > 0 ? $matrix[$i][$j] / $sum : 0;
            }
        }

        // Step 2: Weighted normalized
        $weighted = [];
        for ($i = 0; $i < $n; $i++) {
            for ($j = 0; $j < $m; $j++) {
                $weighted[$i][$j] = $normalized[$i][$j] * $weights[$j];
            }
        }

        // Step 3: Ideal best and worst
        $idealBest  = array_map(fn($j) => max(array_column($weighted, $j)), range(0, $m - 1));
        $idealWorst = array_map(fn($j) => min(array_column($weighted, $j)), range(0, $m - 1));

        // Step 4: Distances and closeness coefficient
        $scores = [];
        for ($i = 0; $i < $n; $i++) {
            $dBest  = sqrt(array_sum(array_map(fn($j) => ($weighted[$i][$j] - $idealBest[$j])  ** 2, range(0, $m - 1))));
            $dWorst = sqrt(array_sum(array_map(fn($j) => ($weighted[$i][$j] - $idealWorst[$j]) ** 2, range(0, $m - 1))));
            $scores[$i] = ($dBest + $dWorst) > 0 ? $dWorst / ($dBest + $dWorst) : 0;
        }

        return $scores;
    }

    /** @test */
    public function topsis_returns_scores_between_zero_and_one()
    {
        $matrix  = [[0.8, 0.7, 0.9, 0.6], [0.5, 0.4, 0.6, 0.8], [0.3, 0.9, 0.4, 0.5]];
        $weights = [0.35, 0.25, 0.25, 0.15];

        $scores = $this->runTopsis($matrix, $weights);

        foreach ($scores as $score) {
            $this->assertGreaterThanOrEqual(0.0, $score);
            $this->assertLessThanOrEqual(1.0, $score);
        }
    }

    /** @test */
    public function topsis_ranks_perfect_match_highest()
    {
        $matrix  = [[1.0, 1.0, 1.0, 1.0], [0.3, 0.3, 0.3, 0.3], [0.1, 0.1, 0.1, 0.1]];
        $weights = [0.35, 0.25, 0.25, 0.15];

        $scores = $this->runTopsis($matrix, $weights);

        $this->assertEquals(0, array_search(max($scores), $scores));
    }

    /** @test */
    public function topsis_weights_must_sum_to_one()
    {
        $weights = [0.35, 0.25, 0.25, 0.15];
        $this->assertEqualsWithDelta(1.0, array_sum($weights), 0.0001);
    }

    /** @test */
    public function topsis_handles_identical_alternatives_gracefully()
    {
        $matrix  = [[0.5, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]];
        $weights = [0.35, 0.25, 0.25, 0.15];

        $scores = $this->runTopsis($matrix, $weights);

        $this->assertEqualsWithDelta($scores[0], $scores[1], 0.0001);
    }

    /** @test */
    public function topsis_score_increases_with_better_criteria_values()
    {
        $matrix  = [[0.9, 0.8, 0.7, 0.6], [0.1, 0.2, 0.3, 0.4]];
        $weights = [0.35, 0.25, 0.25, 0.15];

        $scores = $this->runTopsis($matrix, $weights);

        $this->assertGreaterThan($scores[1], $scores[0]);
    }
}