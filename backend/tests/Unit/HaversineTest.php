<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class HaversineTest extends TestCase
{
    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $R    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a    = sin($dLat / 2) ** 2
              + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /** @test */
    public function same_coordinates_return_zero_distance()
    {
        $dist = $this->haversine(14.5764, 121.0851, 14.5764, 121.0851);
        $this->assertEqualsWithDelta(0.0, $dist, 0.001);
    }

    /** @test */
    public function known_pasig_distance_is_within_acceptable_margin()
    {
        // Pasig City Hall to Ortigas Center area — expected ~2–4 km
        $dist = $this->haversine(14.5764, 121.0851, 14.5870, 121.0580);
        $this->assertGreaterThan(0, $dist);
        $this->assertLessThan(10, $dist);
    }

    /** @test */
    public function gym_within_15km_threshold_passes_filter()
    {
        $threshold = 15.0;
        $dist      = $this->haversine(14.5764, 121.0851, 14.5870, 121.0700);
        $this->assertLessThan($threshold, $dist);
    }

    /** @test */
    public function gym_beyond_15km_threshold_fails_filter()
    {
        $threshold = 15.0;
        // Somewhere in Laguna — clearly >15 km
        $dist = $this->haversine(14.5764, 121.0851, 14.2000, 121.1500);
        $this->assertGreaterThan($threshold, $dist);
    }

    /** @test */
    public function distance_is_symmetric()
    {
        $d1 = $this->haversine(14.5764, 121.0851, 14.5870, 121.0580);
        $d2 = $this->haversine(14.5870, 121.0580, 14.5764, 121.0851);
        $this->assertEqualsWithDelta($d1, $d2, 0.001);
    }
}