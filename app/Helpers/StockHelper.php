<?php

namespace App\Helpers;

class StockHelper
{
    // Convert cartons + lines to total lines
    public static function toLines($cartons, $lines_per_carton)
    {
        return $cartons * $lines_per_carton;
    }

    // Convert total lines to C/L display
    public static function formatCartonLine($total_lines, $lines_per_carton)
    {
        // Handle negative quantities (for sold movements)
        $isNegative = $total_lines < 0;
        $absoluteLines = abs($total_lines);

        if ($lines_per_carton <= 1) {
            return ($isNegative ? '-' : '').(string) $absoluteLines; // No carton format needed
        }

        $cartons = intdiv($absoluteLines, $lines_per_carton);
        $lines = $absoluteLines % $lines_per_carton;

        $result = '';
        if ($isNegative) {
            $result = '-';
        }

        if ($cartons > 0 && $lines > 0) {
            $result .= "{$cartons}C{$lines}L";
        } elseif ($cartons > 0) {
            $result .= "{$cartons}C";
        } elseif ($lines > 0) {
            $result .= "{$lines}L";
        } else {
            $result .= '0';
        }

        return $result;
    }

    // Parse carton/line format string and convert to total lines
    // Examples: "5C2L" = 5 cartons + 2 lines, "10C" = 10 cartons, "15L" = 15 lines
    public static function parseCartonLineFormat($input, $lines_per_carton)
    {
        $input = trim($input);

        // If it's just a number, treat as cartons (convert to total lines)
        if (is_numeric($input)) {
            return (int) $input * $lines_per_carton;
        }

        $totalLines = 0;

        // Match cartons: 5C, 10C, etc.
        if (preg_match('/(\d+)C/i', $input, $matches)) {
            $cartons = (int) $matches[1];
            $totalLines += $cartons * $lines_per_carton;
        }

        // Match lines: 2L, 5L, etc.
        if (preg_match('/(\d+)L/i', $input, $matches)) {
            $lines = (int) $matches[1];
            $totalLines += $lines;
        }

        // If no matches found, try to parse as just a number (cartons)
        if ($totalLines === 0 && is_numeric($input)) {
            $totalLines = (int) $input * $lines_per_carton;
        }

        return $totalLines;
    }

    // Calculate price per carton from price per line
    public static function pricePerCarton($price_per_line, $lines_per_carton)
    {
        if ($lines_per_carton <= 0) {
            return 0; // Avoid division errors
        }

        return $price_per_line * $lines_per_carton;
    }

    // Calculate price per line from price per carton
    public static function pricePerLine($price_per_carton, $lines_per_carton)
    {
        if ($lines_per_carton <= 0) {
            return 0; // Avoid division errors
        }

        return $price_per_carton / $lines_per_carton;
    }

    // Sum array of C/L formatted strings into one total
    public static function sumCartonLine($formatted)
    {
        $totalCartons = 0;
        $totalLines = 0;

        $parts = explode('+', str_replace(' ', '', $formatted));
        foreach ($parts as $part) {
            preg_match_all('/(\d+)(C|L)/', $part, $matches, PREG_SET_ORDER);
            foreach ($matches as $match) {
                if ($match[2] === 'C') {
                    $totalCartons += (int) $match[1];
                } elseif ($match[2] === 'L') {
                    $totalLines += (int) $match[1];
                }
            }
            if (preg_match('/^\d+$/', $part)) {
                $totalCartons += (int) $part;
            }
        }

        $result = '';
        if ($totalCartons > 0) {
            $result .= $totalCartons.'C';
        }
        if ($totalLines > 0) {
            if ($result) {
                $result .= ' ';
            }
            $result .= $totalLines.'L';
        }

        return $result ?: '0';
    }
}
