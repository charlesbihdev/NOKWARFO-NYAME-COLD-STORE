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
}
