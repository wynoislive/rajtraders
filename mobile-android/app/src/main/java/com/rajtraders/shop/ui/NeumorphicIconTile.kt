package com.rajtraders.shop.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Humanized Neumorphic & Tactile Icon Tile for Jetpack Compose.
 * Features warm ceramic ivory surfaces, soft dual-shadow micro-depth,
 * and dynamic state-shifting with Raj Traders Teal and Saffron accents.
 */
@Composable
fun NeumorphicIconTile(
    icon: ImageVector,
    contentDescription: String?,
    isSelected: Boolean = false,
    size: Dp = 36.dp,
    iconSize: Dp = 18.dp,
    shapeRadius: Dp = 10.dp,
    onClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val shape = RoundedCornerShape(shapeRadius)

    val backgroundBrush = if (isSelected) {
        Brush.linearGradient(
            colors = listOf(Color(0xFF0E3D42), Color(0xFF092A2E))
        )
    } else {
        Brush.linearGradient(
            colors = listOf(Color(0xFFFFFFFF), Color(0xFFF4EFE6))
        )
    }

    val iconColor by animateColorAsState(
        targetValue = if (isSelected) Color(0xFFE2A93B) else Color(0xFF0E3D42),
        animationSpec = tween(durationMillis = 200),
        label = "iconColor"
    )

    val borderColor = if (isSelected) {
        Color(0xFFC88A2C).copy(alpha = 0.5f)
    } else {
        Color.White.copy(alpha = 0.9f)
    }

    val shadowElevation = if (isSelected) 1.dp else 4.dp

    Box(
        modifier = modifier
            .shadow(
                elevation = shadowElevation,
                shape = shape,
                ambientColor = Color(0xFF0E3D42).copy(alpha = 0.15f),
                spotColor = Color(0xFF0E3D42).copy(alpha = 0.25f)
            )
            .clip(shape)
            .background(backgroundBrush)
            .border(width = 1.dp, color = borderColor, shape = shape)
            .then(
                if (onClick != null) {
                    Modifier.clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = onClick
                    )
                } else Modifier
            )
            .size(size),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = iconColor,
            modifier = Modifier.size(iconSize)
        )
    }
}

/**
 * Tactile Neumorphic Pill for displaying contact details (Phone, Email, etc.)
 * without relying on raw emojis.
 */
@Composable
fun NeumorphicContactPill(
    icon: ImageVector,
    label: String,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null
) {
    val shape = RoundedCornerShape(16.dp)

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .shadow(
                elevation = 2.dp,
                shape = shape,
                ambientColor = Color(0xFF0E3D42).copy(alpha = 0.08f),
                spotColor = Color(0xFF0E3D42).copy(alpha = 0.12f)
            )
            .clip(shape)
            .background(
                Brush.linearGradient(
                    colors = listOf(Color(0xFFFFFFFF), Color(0xFFF9F7F2))
                )
            )
            .border(width = 1.dp, color = Color.White, shape = shape)
            .then(
                if (onClick != null) {
                    Modifier.clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = onClick
                    )
                } else Modifier
            )
            .padding(horizontal = 10.dp, vertical = 6.dp)
    ) {
        NeumorphicIconTile(
            icon = icon,
            contentDescription = null,
            isSelected = false,
            size = 24.dp,
            iconSize = 13.dp,
            shapeRadius = 7.dp
        )
        Spacer(Modifier.width(8.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF0E3D42)
        )
    }
}
