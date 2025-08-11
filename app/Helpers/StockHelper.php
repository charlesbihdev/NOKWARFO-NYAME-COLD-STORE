<?php

namespace App\Helpers;

class StockHelper
{
    // Convert cartons + lines to total lines
    public static function toLines($cartons, $lines_per_carton)
    {
        return ($cartons * $lines_per_carton);
    }

    // Convert total lines to C/L display
    public static function formatCartonLine($total_lines, $lines_per_carton)
    {
        if ($lines_per_carton <= 1) {
            return (string) $total_lines; // No carton format needed
        }

        $cartons = intdiv($total_lines, $lines_per_carton);
        $lines = $total_lines % $lines_per_carton;

        if ($cartons > 0 && $lines > 0) {
            return "{$cartons}C{$lines}L";
        } elseif ($cartons > 0) {
            return "{$cartons}C";
        } elseif ($lines > 0) {
            return "{$lines}L";
        }

        return "0";
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
                    $totalCartons += (int)$match[1];
                } elseif ($match[2] === 'L') {
                    $totalLines += (int)$match[1];
                }
            }
            if (preg_match('/^\d+$/', $part)) {
                $totalCartons += (int)$part;
            }
        }

        $result = '';
        if ($totalCartons > 0) {
            $result .= $totalCartons . 'C';
        }
        if ($totalLines > 0) {
            if ($result) {
                $result .= ' ';
            }
            $result .= $totalLines . 'L';
        }

        return $result ?: '0';
    }
}
