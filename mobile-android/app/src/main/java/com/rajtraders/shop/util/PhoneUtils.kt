package com.rajtraders.shop.util

/**
 * Standardized utility functions for Indian Mobile Number handling, validation, and presentation.
 * Enforces clean 10-digit string value contract with +91 country representation across the Android app.
 */
object PhoneUtils {

    /**
     * Cleans user input or pasted string down to a maximum of 10 digits.
     * Automatically handles pasted prefixes like '+91', '91', '0', spaces, and hyphens.
     */
    fun cleanIndianMobile(raw: String?): String {
        if (raw.isNullOrBlank()) return ""
        var digits = raw.filter { it.isDigit() }

        // Strip country code if pasted with 91... or 0...
        if (digits.startsWith("91") && digits.length > 10) {
            digits = digits.substring(2)
        } else if (digits.startsWith("0") && digits.length > 10) {
            digits = digits.substring(1)
        }

        return digits.take(10)
    }

    /**
     * Formats clean 10 digits into spaced 5+5 group for input display (e.g. "98765 43210").
     */
    fun formatInputGroupMobile(cleanDigits: String): String {
        if (cleanDigits.isEmpty()) return ""
        val digits = cleanDigits.take(10)
        return if (digits.length <= 5) digits else "${digits.take(5)} ${digits.drop(5)}"
    }

    /**
     * Formats any stored mobile string for UI display.
     * Returns "+91 98765 43210".
     */
    fun formatDisplayMobile(raw: String?): String {
        if (raw.isNullOrBlank()) return ""
        val clean = cleanIndianMobile(raw)
        return if (clean.length == 10) {
            "+91 ${clean.take(5)} ${clean.drop(5)}"
        } else {
            raw
        }
    }

    /**
     * Checks if the 10-digit number is a valid Indian mobile number.
     * Valid Indian numbers start with 6, 7, 8, or 9 and are exactly 10 digits long.
     */
    fun isValidIndianMobile(raw: String?): Boolean {
        val clean = cleanIndianMobile(raw)
        return clean.matches(Regex("^[6-9]\\d{9}$"))
    }

    /**
     * Checks if the first entered digit is valid (6, 7, 8, or 9).
     */
    fun isValidStartingDigit(cleanDigits: String): Boolean {
        if (cleanDigits.isEmpty()) return true
        return cleanDigits.first() in listOf('6', '7', '8', '9')
    }
}
