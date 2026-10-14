package com.rajtraders.shop.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.rajtraders.shop.util.PhoneUtils

/**
 * Standardized Material 3 Mobile Number input field for Indian numbers.
 * Features integrated '+91 🇮🇳' prefix badge, 5+5 spaced grouping mask,
 * instant 10-digit validation indicator, and starting digit guidance.
 */
@Composable
fun MobileNumberField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String = "Mobile Number",
    isError: Boolean = false,
    errorMessage: String? = null,
    enabled: Boolean = true
) {
    val cleanDigits = PhoneUtils.cleanIndianMobile(value)
    val formattedDisplay = PhoneUtils.formatInputGroupMobile(cleanDigits)
    val isValid = PhoneUtils.isValidIndianMobile(cleanDigits)
    val isInvalidStart = !PhoneUtils.isValidStartingDigit(cleanDigits)

    OutlinedTextField(
        value = formattedDisplay,
        onValueChange = { input ->
            val cleaned = PhoneUtils.cleanIndianMobile(input)
            onValueChange(cleaned)
        },
        modifier = modifier,
        enabled = enabled,
        singleLine = true,
        label = { Text(label) },
        placeholder = { Text("98765 43210") },
        leadingIcon = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(start = 12.dp, end = 8.dp)
            ) {
                Text("🇮🇳", style = MaterialTheme.typography.bodyLarge)
                Spacer(Modifier.width(4.dp))
                Text(
                    "+91",
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF1E293B)
                )
                Spacer(Modifier.width(8.dp))
                Box(
                    modifier = Modifier
                        .width(1.dp)
                        .height(20.dp)
                        .background(Color(0xFFCBD5E1))
                )
            }
        },
        trailingIcon = {
            if (isValid) {
                Icon(
                    Icons.Outlined.CheckCircle,
                    contentDescription = "Valid 10-digit mobile number",
                    tint = Color(0xFF147A46),
                    modifier = Modifier.size(20.dp)
                )
            } else if (isInvalidStart) {
                Icon(
                    Icons.Outlined.Warning,
                    contentDescription = "Invalid starting digit",
                    tint = Color(0xFFB45309),
                    modifier = Modifier.size(20.dp)
                )
            }
        },
        supportingText = {
            if (isInvalidStart) {
                Text(
                    "Indian mobile numbers must start with 6, 7, 8, or 9",
                    color = Color(0xFFB45309),
                    style = MaterialTheme.typography.labelSmall
                )
            } else if (cleanDigits.isNotEmpty() && cleanDigits.length < 10) {
                Text(
                    "${cleanDigits.length}/10 digits",
                    color = Color.Gray,
                    style = MaterialTheme.typography.labelSmall
                )
            } else if (isError && !errorMessage.isNullOrBlank()) {
                Text(
                    errorMessage,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.labelSmall
                )
            }
        },
        isError = isError || isInvalidStart,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Color(0xFF0E3D42),
            focusedLabelColor = Color(0xFF0E3D42),
            cursorColor = Color(0xFF0E3D42),
        )
    )
}
