<?php

namespace App\Http\Controllers;

use App\Models\Faq;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FaqController extends Controller
{
    public function index(Request $request)
    {
        $q = Faq::query();

        if ($request->filled('active')) {
            $active = filter_var($request->input('active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if (!is_null($active)) {
                $q->where('is_active', $active);
            }
        }

        if ($request->filled('category')) {
            $q->where('category', $request->string('category'));
        }

        if ($request->filled('search')) {
            $s = trim((string) $request->input('search'));
            $q->where(function ($qq) use ($s) {
                $qq->where('question', 'ilike', "%{$s}%")
                   ->orWhere('answer', 'ilike', "%{$s}%")
                   ->orWhere('category', 'ilike', "%{$s}%");
            });
        }

        $q->orderBy('display_order', 'asc')
          ->orderBy('faq_id', 'asc');

        $perPage = (int) ($request->input('per_page', 50));
        $perPage = max(1, min(200, $perPage));

        return response()->json([
            'data' => $q->paginate($perPage),
        ]);
    }

    public function active(Request $request)
    {
        $q = Faq::query()->where('is_active', true);

        if ($request->filled('category')) {
            $q->where('category', $request->string('category'));
        }

        $q->orderBy('display_order', 'asc')
          ->orderBy('faq_id', 'asc');

        return response()->json([
            'data' => $q->get(),
        ]);
    }

    public function show(Faq $faq)
    {
        return response()->json([
            'data' => $faq,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'question' => ['required', 'string'],
            'answer' => ['required', 'string'],
            'category' => ['nullable', 'string', 'max:100'],
            'display_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $data['display_order'] = $data['display_order'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;

        $faq = Faq::create($data);

        return response()->json([
            'message' => 'FAQ created',
            'data' => $faq,
        ], 201);
    }

    public function update(Request $request, Faq $faq)
    {
        $data = $request->validate([
            'question' => ['sometimes', 'required', 'string'],
            'answer' => ['sometimes', 'required', 'string'],
            'category' => ['sometimes', 'nullable', 'string', 'max:100'],
            'display_order' => ['sometimes', 'nullable', 'integer'],
            'is_active' => ['sometimes', 'nullable', 'boolean'],
        ]);

        $faq->fill($data);
        $faq->save();

        return response()->json([
            'message' => 'FAQ updated',
            'data' => $faq,
        ]);
    }

    // DELETE /api/v1/faqs/{faq}
    public function destroy(Faq $faq)
    {
        $faq->delete();

        return response()->json([
            'message' => 'FAQ deleted',
        ]);
    }

    // PATCH /api/v1/faqs/{faq}/toggle
    public function toggle(Faq $faq)
    {
        $faq->is_active = !$faq->is_active;
        $faq->save();

        return response()->json([
            'message' => 'FAQ active state toggled',
            'data' => $faq,
        ]);
    }
}