<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class NewsController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | SHARED HELPERS
    |--------------------------------------------------------------------------
    */

    private array $keywords = [
        'fitness', 'gym', 'workout', 'exercise', 'health', 'nutrition',
        'diet', 'muscle', 'weight', 'training', 'cardio', 'protein',
        'wellness', 'crossfit', 'pilates', 'yoga', 'bodybuilding',
        'lifting', 'running', 'marathon', 'sports', 'athletic',
    ];

    private function parseFeed(string $body, string $sourceName): array
    {
        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($body, 'SimpleXMLElement', LIBXML_NOCDATA);
        libxml_clear_errors();

        if (!$xml) {
            return [];
        }

        $items    = $xml->channel->item ?? $xml->entry ?? [];
        $articles = [];

        foreach ($items as $item) {
            $title = trim((string) ($item->title ?? ''));
            if (!$title) {
                continue;
            }

            $url = trim((string) ($item->link ?? $item->id ?? ''));
            if (!$url && isset($item->link['href'])) {
                $url = (string) $item->link['href'];
            }
            if (!$url) {
                continue;
            }

            $image = null;
            $media = $item->children('media', true);
            if (isset($media->content)) {
                $image = (string) $media->content->attributes()->url;
            }
            if (!$image && isset($item->enclosure)) {
                $encType = (string) $item->enclosure->attributes()->type;
                if (str_starts_with($encType, 'image/')) {
                    $image = (string) $item->enclosure->attributes()->url;
                }
            }
            $rawDesc = (string) ($item->description ?? $item->summary ?? $item->content ?? '');
            if (!$image && preg_match('/<img[^>]+src=["\']([^"\']+)["\']/', $rawDesc, $m)) {
                $image = $m[1];
            }

            $description = trim(substr(strip_tags($rawDesc), 0, 220));

            $pubRaw      = (string) ($item->pubDate ?? $item->published ?? $item->updated ?? '');
            $publishedAt = null;
            if ($pubRaw) {
                try {
                    $publishedAt = Carbon::parse($pubRaw)->toIso8601String();
                } catch (\Exception) {
                    $publishedAt = $pubRaw;
                }
            }

            $articles[] = [
                'title'        => $title,
                'description'  => $description,
                'url'          => $url,
                'image'        => $image ?: null,
                'source'       => $sourceName,
                'published_at' => $publishedAt,
            ];
        }

        return $articles;
    }

    private function isRelevant(array $article): bool
    {
        $haystack = strtolower($article['title'] . ' ' . ($article['description'] ?? ''));
        foreach ($this->keywords as $kw) {
            if (str_contains($haystack, $kw)) {
                return true;
            }
        }
        return false;
    }

    /*
    |--------------------------------------------------------------------------
    | FITNESS NEWS
    | Sources: PH publications + Reddit r/PHFitness & r/Philippines
    |          + global fitness sites (keyword-filtered)
    |--------------------------------------------------------------------------
    */

    public function fitness()
    {
        $articles = Cache::remember('fitness_news_ph_v4', now()->addHours(3), function () {

            $feeds = [
    // PH sources
    ['url' => 'https://www.philstar.com/rss/lifestyle',                     'source' => 'Philippine Star'],
    ['url' => 'https://lifestyle.inquirer.net/feed/',                       'source' => 'Inquirer Lifestyle'],
    ['url' => 'https://cnnphilippines.com/rss/life.rss',                    'source' => 'CNN Philippines'],
    ['url' => 'https://mb.com.ph/category/lifestyle/feed/',                 'source' => 'Manila Bulletin'],
    ['url' => 'https://www.manilatimes.net/category/sports-and-fitness/rss','source' => 'Manila Times'],
    ['url' => 'https://www.rappler.com/life-and-style/rss',                 'source' => 'Rappler'],
    ['url' => 'https://businessmirror.com.ph/category/health/feed/',        'source' => 'Business Mirror'],
    ['url' => 'https://www.sunstar.com.ph/rss',                             'source' => 'Sun Star'],
    ['url' => 'https://news.abs-cbn.com/rss/pinoy-abroad',                  'source' => 'ABS-CBN'],
    ['url' => 'https://www.gmanetwork.com/news/rss/lifestyle/',              'source' => 'GMA News'],

    // global fitness — keyword filtered
    ['url' => 'https://www.menshealth.com/rss/all.xml/',                    'source' => "Men's Health"],
    ['url' => 'https://www.healthline.com/rss/health-news',                 'source' => 'Healthline'],
    ['url' => 'https://www.shape.com/feed/rss',                             'source' => 'Shape'],
    ['url' => 'https://www.womenshealthmag.com/rss/all.xml/',               'source' => "Women's Health"],
    ['url' => 'https://www.runnersworld.com/rss/all.xml/',                  'source' => "Runner's World"],
    ['url' => 'https://barbend.com/feed/',                                  'source' => 'Barbend'],
    ['url' => 'https://breakingmuscle.com/feed/',                           'source' => 'Breaking Muscle'],
    ['url' => 'https://www.muscleandfitness.com/rss',                       'source' => 'Muscle & Fitness'],
];

            $allArticles = [];

            foreach ($feeds as $feed) {
                try {
                    $res = Http::timeout(8)
                        ->withHeaders(['User-Agent' => 'Mozilla/5.0 (compatible; ExerSearch/1.0)'])
                        ->get($feed['url']);

                    if ($res->successful()) {
                        $allArticles = array_merge(
                            $allArticles,
                            $this->parseFeed($res->body(), $feed['source'])
                        );
                    }
                } catch (\Exception) {
                    continue;
                }
            }

            // Reddit r/PHFitness + r/Philippines (fitness posts only)
            $redditSubs = ['PHFitness', 'Philippines'];

            foreach ($redditSubs as $sub) {
                try {
                    $res = Http::timeout(8)
                        ->withHeaders(['User-Agent' => 'ExerSearch/1.0 (fitness dashboard)'])
                        ->get("https://www.reddit.com/r/{$sub}/hot.json", ['limit' => 15]);

                    if (!$res->successful()) {
                        continue;
                    }

                    foreach ($res->json('data.children') ?? [] as $post) {
                        $p     = $post['data'];
                        $title = trim($p['title'] ?? '');
                        if (!$title) {
                            continue;
                        }

                        $allArticles[] = [
                            'title'        => $title,
                            'description'  => strip_tags($p['selftext'] ?? ''),
                            'url'          => 'https://reddit.com' . ($p['permalink'] ?? ''),
                            'image'        => $p['thumbnail'] ?? null,
                            'source'       => 'r/' . $sub,
                            'published_at' => isset($p['created_utc'])
                                ? Carbon::createFromTimestamp((int) $p['created_utc'])->toIso8601String()
                                : null,
                        ];
                    }
                } catch (\Exception) {
                    continue;
                }
            }

            // Deduplicate -> relevance filter -> sort newest-first -> top 9
            $seen     = [];
            $filtered = [];

            foreach ($allArticles as $article) {
                if (in_array($article['url'], $seen, true)) {
                    continue;
                }
                if (!$this->isRelevant($article)) {
                    continue;
                }
                $seen[]     = $article['url'];
                $filtered[] = $article;
            }

            usort($filtered, function ($a, $b) {
                $ta = $a['published_at'] ? strtotime($a['published_at']) : 0;
                $tb = $b['published_at'] ? strtotime($b['published_at']) : 0;
                return $tb <=> $ta;
            });

            return array_slice($filtered, 0, 15);
        });

        return response()->json(['data' => $articles]);
    }

    /*
    |--------------------------------------------------------------------------
    | FITNESS TRENDS
    | Curated seasonal PH trends rotated by Philippine calendar month.
    | No external API required.
    |--------------------------------------------------------------------------
    */

    public function trends()
    {
        $trends = Cache::remember('fitness_trends_ph_seasonal_v2', now()->addHours(12), function () {

            $month = (int) now('Asia/Manila')->format('n');

            // January - February: New Year resolution season
            if (in_array($month, [1, 2])) {
                $seasonal = [
                    ['keyword' => 'New Year fitness goals Philippines',    'trend_score' => 100],
                    ['keyword' => 'gym membership promo January PH',       'trend_score' => 96],
                    ['keyword' => 'weight loss tips Filipino diet',        'trend_score' => 91],
                    ['keyword' => 'home workout no equipment Philippines', 'trend_score' => 86],
                    ['keyword' => 'calorie deficit Filipino food',         'trend_score' => 81],
                    ['keyword' => 'beginner gym routine PH',               'trend_score' => 76],
                    ['keyword' => 'best protein powder Philippines 2026',  'trend_score' => 70],
                    ['keyword' => 'affordable gym Metro Manila',           'trend_score' => 64],
                ];

            // March - May: Summer / beach season
            // example for Summer (March-May) — add as many as you want
} elseif (in_array($month, [3, 4, 5])) {
    $seasonal = [
        ['keyword' => 'summer body workout Philippines',       'trend_score' => 100],
        ['keyword' => 'beach ready diet plan PH',              'trend_score' => 95],
        ['keyword' => 'how to lose belly fat fast Filipino',   'trend_score' => 89],
        ['keyword' => 'outdoor workout Metro Manila parks',    'trend_score' => 83],
        ['keyword' => 'calisthenics park workout Philippines', 'trend_score' => 78],
        ['keyword' => 'protein sources cheap Philippines',     'trend_score' => 72],
        ['keyword' => 'gym open Holy Week Philippines',        'trend_score' => 66],
        ['keyword' => 'summer sports leagues Philippines',     'trend_score' => 60],
        // ↓ add more below
        ['keyword' => 'swimming workout Philippines',          'trend_score' => 57],
        ['keyword' => 'fat loss diet for Filipinos',           'trend_score' => 54],
        ['keyword' => 'best gym shorts Philippines',           'trend_score' => 50],
        ['keyword' => 'pre-workout supplement PH summer',     'trend_score' => 47],
        ['keyword' => 'HIIT workout summer Philippines',      'trend_score' => 44],
        ['keyword' => 'whey protein price Philippines 2026',  'trend_score' => 41],
        
    ];

            // June - August: Rainy / indoor season
            } elseif (in_array($month, [6, 7, 8])) {
                $seasonal = [
                    ['keyword' => 'indoor gym workout Philippines rainy',  'trend_score' => 100],
                    ['keyword' => 'home gym setup Philippines budget',     'trend_score' => 94],
                    ['keyword' => 'creatine supplement Philippines price', 'trend_score' => 88],
                    ['keyword' => 'HIIT workout for Filipinos',            'trend_score' => 82],
                    ['keyword' => 'high protein Filipino ulam ideas',      'trend_score' => 76],
                    ['keyword' => 'gym flood Metro Manila avoid',          'trend_score' => 70],
                    ['keyword' => 'online fitness class Philippines',      'trend_score' => 64],
                    ['keyword' => 'intermittent fasting Filipino schedule','trend_score' => 58],
                ];

            // September - October: Ber months / back-to-routine
            } elseif (in_array($month, [9, 10])) {
                $seasonal = [
                    ['keyword' => 'gym comeback routine Philippines',      'trend_score' => 100],
                    ['keyword' => 'beginner lifting program PH',           'trend_score' => 93],
                    ['keyword' => 'macro tracking Filipino food guide',    'trend_score' => 87],
                    ['keyword' => 'affordable gym Cebu Davao',             'trend_score' => 81],
                    ['keyword' => 'running clubs Philippines 2026',        'trend_score' => 75],
                    ['keyword' => 'best pre-workout supplement PH',       'trend_score' => 68],
                    ['keyword' => 'BER months fitness challenge PH',      'trend_score' => 62],
                    ['keyword' => 'sports nutrition store Philippines',    'trend_score' => 56],
                ];

            // November - December: Holiday season
            } else {
                $seasonal = [
                    ['keyword' => 'holiday fitness tips Philippines',      'trend_score' => 100],
                    ['keyword' => 'avoid holiday weight gain PH',          'trend_score' => 94],
                    ['keyword' => 'gym gift ideas Philippines Christmas',  'trend_score' => 88],
                    ['keyword' => 'year-end body recomposition PH',       'trend_score' => 82],
                    ['keyword' => 'New Year gym plan 2027 Philippines',    'trend_score' => 76],
                    ['keyword' => 'Noche Buena healthy alternatives PH',  'trend_score' => 70],
                    ['keyword' => 'gym open Christmas New Year PH',       'trend_score' => 64],
                    ['keyword' => 'December fitness promo Philippines',    'trend_score' => 58],
                ];
            }

            return $seasonal;
        });

        return response()->json(['data' => $trends]);
    }

    /*
    |--------------------------------------------------------------------------
    | COMMUNITY DISCUSSIONS
    | r/PHFitness primary -> r/phgym -> r/Fitness fallback
    |--------------------------------------------------------------------------
    */

    public function discussions()
    {
        $posts = Cache::remember('fitness_discussions_ph_v2', now()->addHours(2), function () {

            $subreddits = ['PHFitness', 'phgym', 'Fitness'];
            $allPosts   = [];

            foreach ($subreddits as $sub) {
                try {
                    $res = Http::timeout(8)
                        ->withHeaders(['User-Agent' => 'ExerSearch/1.0 (fitness dashboard)'])
                        ->get("https://www.reddit.com/r/{$sub}/hot.json", ['limit' => 10]);

                    if (!$res->successful()) {
                        continue;
                    }

                    foreach ($res->json('data.children') ?? [] as $post) {
                        $p = $post['data'];

                        $allPosts[] = [
                            'title'     => $p['title'] ?? '',
                            'url'       => 'https://reddit.com' . ($p['permalink'] ?? ''),
                            'upvotes'   => (int) ($p['ups'] ?? 0),
                            'comments'  => (int) ($p['num_comments'] ?? 0),
                            'subreddit' => 'r/' . ($p['subreddit'] ?? $sub),
                            'flair'     => $p['link_flair_text'] ?? null,
                        ];
                    }
                } catch (\Exception) {
                    continue;
                }
            }

            $seen  = [];
            $dedup = [];
            foreach ($allPosts as $post) {
                if (!in_array($post['url'], $seen, true)) {
                    $seen[]  = $post['url'];
                    $dedup[] = $post;
                }
            }

            usort($dedup, fn($a, $b) => $b['upvotes'] <=> $a['upvotes']);

            return array_slice($dedup, 0, 10);
        });

        return response()->json(['data' => $posts]);
    }
}