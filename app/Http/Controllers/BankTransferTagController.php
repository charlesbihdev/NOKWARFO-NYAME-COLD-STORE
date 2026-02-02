<?php

namespace App\Http\Controllers;

use App\Models\BankTransferTag;
use Illuminate\Http\Request;

class BankTransferTagController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:bank_transfer_tags',
        ]);

        BankTransferTag::create($validated);

        return back()->with('success', 'Tag created successfully.');
    }

    public function update(Request $request, BankTransferTag $tag)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:bank_transfer_tags,name,'.$tag->id,
        ]);

        $tag->update($validated);

        return back()->with('success', 'Tag updated successfully.');
    }

    public function destroy(BankTransferTag $tag)
    {
        $tag->delete();

        return back()->with('success', 'Tag deleted successfully.');
    }
}
