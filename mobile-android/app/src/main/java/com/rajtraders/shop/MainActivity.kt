package com.rajtraders.shop

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.ui.res.painterResource
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Remove
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material.icons.outlined.Verified
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.Policy
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.MyLocation
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import android.Manifest
import android.content.pm.PackageManager
import android.location.LocationManager
import android.location.Geocoder
import androidx.core.content.ContextCompat
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import com.rajtraders.shop.data.CustomerAddress
import com.rajtraders.shop.data.CustomerCoupon
import com.rajtraders.shop.data.NotificationItem
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.LocalTextStyle
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.text.style.TextDecoration
import coil.compose.AsyncImage
import com.rajtraders.shop.data.Product
import java.text.NumberFormat
import java.util.Currency
import java.util.Locale

private val RajTeal = Color(0xFF0E3D42)
private val RajSaffron = Color(0xFFE2A93B)
private val RajCanvas = Color(0xFFF7F2EA)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            RajTradersTheme {
                val viewModel: StorefrontViewModel = viewModel(factory = StorefrontViewModelFactory())
                RajTradersApp(viewModel)
            }
        }
    }
}

@Composable
private fun RajTradersTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = MaterialTheme.colorScheme.copy(
            primary = RajTeal,
            secondary = RajSaffron,
            background = RajCanvas,
            surface = Color.White,
        ),
        content = content,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RajTradersApp(viewModel: StorefrontViewModel) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var selectedTab by remember { mutableIntStateOf(0) }
    val cartCount = state.cart.sumOf { it.quantity }

    Scaffold(
        containerColor = RajCanvas,
        topBar = {
            Column {
                TopAppBar(
                    navigationIcon = {
                        Image(
                            painter = painterResource(id = R.drawable.logo),
                            contentDescription = "Raj Traders Logo",
                            modifier = Modifier
                                .padding(start = 12.dp, end = 4.dp)
                                .size(38.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, RajSaffron.copy(alpha = 0.5f), RoundedCornerShape(8.dp)),
                            contentScale = ContentScale.Crop
                        )
                    },
                    title = {
                        Column {
                            Text(state.shopName, fontWeight = FontWeight.Bold)
                            Text(
                                state.currentUser?.firstName?.let { "Welcome, $it!" } ?: "gourmet bakery & artisanal cakes",
                                style = MaterialTheme.typography.labelSmall,
                            )
                        }
                    },
                    actions = {
                        IconButton(onClick = { viewModel.openNotificationsDialog() }) {
                            Box {
                                Icon(Icons.Outlined.Notifications, contentDescription = "Notifications")
                                if (state.unreadNotificationsCount > 0) {
                                    Surface(
                                        modifier = Modifier.align(Alignment.TopEnd).size(16.dp),
                                        shape = CircleShape,
                                        color = Color(0xFFB84A3D),
                                    ) {
                                        Text(
                                            "${state.unreadNotificationsCount}",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color.White,
                                            fontSize = 9.sp,
                                            textAlign = TextAlign.Center
                                        )
                                    }
                                }
                            }
                        }
                        IconButton(onClick = { selectedTab = 1 }) {
                            Box {
                                Icon(Icons.Outlined.ShoppingBag, contentDescription = "Open bag")
                                if (cartCount > 0) {
                                    Surface(
                                        modifier = Modifier.align(Alignment.TopEnd).size(16.dp),
                                        shape = RoundedCornerShape(8.dp),
                                        color = RajSaffron,
                                    ) {
                                        Text("$cartCount", style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(start = 4.dp))
                                    }
                                }
                            }
                        }
                    },
                )
                // Amazon-style Location Header Bar
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = RajTeal,
                    onClick = { viewModel.openPincodeDialog() }
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Outlined.LocationOn,
                            contentDescription = "Location",
                            tint = RajSaffron,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = "Deliver to ${state.selectedCity} ${state.selectedPincode}",
                            color = Color.White,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            text = "▼",
                            color = RajSaffron,
                            fontSize = 10.sp
                        )
                    }
                }
            }
        },
        bottomBar = {
            Column {
                // Persistent Cart Bubble Bar when items exist in cart and user is browsing outside the Bag tab
                AnimatedVisibility(
                    visible = state.cart.isNotEmpty() && selectedTab != 1,
                    enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                    exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
                ) {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 6.dp)
                            .clickable { selectedTab = 1 },
                        shape = RoundedCornerShape(16.dp),
                        color = RajTeal,
                        shadowElevation = 8.dp,
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(40.dp)
                                        .background(Color.White.copy(alpha = 0.15f), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Outlined.ShoppingBag,
                                        contentDescription = null,
                                        tint = RajSaffron,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    val totalItems = state.cart.sumOf { it.quantity }
                                    Text(
                                        text = "$totalItems ${if (totalItems == 1) "item" else "items"}  •  ${money(viewModel.cartTotalCents())}",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.titleSmall
                                    )
                                    Text(
                                        text = "View Cart  •  Direct Checkout →",
                                        color = Color.White.copy(alpha = 0.75f),
                                        style = MaterialTheme.typography.labelSmall
                                    )
                                }
                            }
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = RajSaffron,
                                modifier = Modifier.clickable { selectedTab = 1 }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        "View Bag",
                                        color = RajTeal,
                                        fontWeight = FontWeight.Black,
                                        style = MaterialTheme.typography.labelMedium
                                    )
                                    Spacer(Modifier.width(4.dp))
                                    Icon(
                                        Icons.AutoMirrored.Outlined.ArrowForward,
                                        contentDescription = null,
                                        tint = RajTeal,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            }
                        }
                    }
                }
                NavigationBar(containerColor = Color.White) {
                    NavigationBarItem(selected = selectedTab == 0, onClick = { selectedTab = 0 }, icon = { Icon(Icons.Outlined.Verified, null) }, label = { Text("Shop") })
                    NavigationBarItem(selected = selectedTab == 1, onClick = { selectedTab = 1 }, icon = { Icon(Icons.Outlined.ShoppingBag, null) }, label = { Text("Bag") })
                    NavigationBarItem(selected = selectedTab == 2, onClick = { selectedTab = 2; viewModel.fetchOrders() }, icon = { Icon(Icons.Outlined.CheckCircle, null) }, label = { Text("Orders") })
                    NavigationBarItem(selected = selectedTab == 3, onClick = { selectedTab = 3; viewModel.fetchCoupons() }, icon = { Icon(Icons.Outlined.Person, null) }, label = { Text("Account") })
                }
            }
        },
    ) { padding ->
        when (selectedTab) {
            0 -> CatalogScreen(state, padding, viewModel)
            1 -> CartScreen(
                state = state,
                padding = padding,
                viewModel = viewModel,
                onNavigateToOrders = { selectedTab = 2; viewModel.fetchOrders() },
                onBrowseMore = { selectedTab = 0 }
            )
            2 -> OrdersScreen(state, padding, viewModel)
            else -> AccountScreen(state, padding, viewModel)
        }
    }

    // PIN code check dialog overlay
    if (state.showPincodeDialog) {
        PincodeDialog(state, viewModel)
    }

    // Customer Available Coupons & Refund Credits Dialog overlay
    if (state.showCouponsDialog) {
        CouponsDialog(state, viewModel, onApplyCoupon = { code ->
            viewModel.applyCoupon(code)
        })
    }

    // Auth dialog overlay
    if (state.showAuthScreen) {
        AuthDialog(state, viewModel)
    }

    // Forgot Password dialog overlay
    if (state.showForgotPasswordDialog) {
        ForgotPasswordDialog(state, viewModel)
    }

    // Reset Password dialog overlay
    if (state.showResetPasswordDialog) {
        ResetPasswordDialog(state, viewModel)
    }

    // Login Email OTP Verification dialog overlay (Nodemailer 2FA)
    if (state.showOtpVerificationDialog) {
        OtpVerificationDialog(state, viewModel)
    }

    // TOTP 2FA Challenge dialog overlay
    if (state.showTotpChallengeDialog) {
        TotpChallengeDialog(state, viewModel)
    }

    // TOTP 2FA Setup dialog overlay
    if (state.showTotpSetupDialog) {
        TotpSetupDialog(state, viewModel)
    }

    // Customer Notifications Dialog overlay
    if (state.showNotificationsDialog) {
        NotificationsDialog(state, viewModel)
    }

    // Customer Saved Address Dialog overlay
    if (state.showAddressDialog) {
        AddressDialog(state, viewModel)
    }

    // Google Play Policy Legal Dialog overlay
    if (state.showLegalDialog) {
        LegalDialog(state, viewModel)
    }
}

// ─── Native Share Helper ────────────────────────────────────

private fun shareProductUrl(context: Context, product: Product, shopName: String = "RAJ TRADERS", domain: String = "sundarvan.xyz") {
    val cleanDomain = domain.trim().removePrefix("https://").removePrefix("http://").removeSuffix("/")
    val shareUrl = "https://$cleanDomain/products/${product.slug}"
    val shareText = "Check out ${product.name} at $shopName! Prep time: ${product.prepTimeMinutes} mins.\n$shareUrl"

    // Always copy directly to Android system Clipboard for maximum compatibility across all devices & BlueStacks
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
    if (clipboard != null) {
        val clip = android.content.ClipData.newPlainText("Product Link", shareUrl)
        clipboard.setPrimaryClip(clip)
        android.widget.Toast.makeText(context, "Product link copied to clipboard!", android.widget.Toast.LENGTH_SHORT).show()
    }

    val sendIntent: Intent = Intent().apply {
        action = Intent.ACTION_SEND
        putExtra(Intent.EXTRA_TEXT, shareText)
        type = "text/plain"
    }
    val shareIntent = Intent.createChooser(sendIntent, "Share ${product.name}")
    context.startActivity(shareIntent)
}

// ─── 1-Tap GPS Location Detector (Bounded to Pali PIN 484551) ──

private fun detectCurrentLocation(
    context: Context,
    onResult: (address: String?, lat: Double?, lon: Double?, isEligible: Boolean) -> Unit
) {
    try {
        val lm = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        val hasPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (lm == null || !hasPermission) {
            onResult(null, null, null, false)
            return
        }

        val location = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            ?: lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
            ?: lm.getLastKnownLocation(LocationManager.PASSIVE_PROVIDER)

        if (location != null) {
            val lat = location.latitude
            val lon = location.longitude

            // Shop Anchor: 23.3644551, 81.0442634 (Birsingpur Pali)
            val distanceResults = FloatArray(1)
            android.location.Location.distanceBetween(lat, lon, 23.3644551, 81.0442634, distanceResults)
            val distanceKm = distanceResults[0] / 1000f

            var resolvedStreet = ""
            var resolvedPin = ""
            try {
                val geocoder = Geocoder(context, Locale.getDefault())
                @Suppress("DEPRECATION")
                val addrs = geocoder.getFromLocation(lat, lon, 1)
                if (!addrs.isNullOrEmpty()) {
                    val a = addrs[0]
                    resolvedPin = a.postalCode ?: ""
                    val street = a.thoroughfare ?: a.subLocality ?: a.featureName ?: ""
                    val locality = a.locality ?: "Birsingpur Pali"
                    resolvedStreet = listOf(street, locality).filter { it.isNotBlank() }.joinToString(", ")
                }
            } catch (_: Exception) { }

            // Bounded to PIN 484551 or within 15km of store
            val isEligible = (resolvedPin == "484551") || (distanceKm <= 15.0f)
            val finalAddress = if (resolvedStreet.isNotBlank()) {
                "$resolvedStreet - 484551"
            } else {
                "Current Location, Birsingpur Pali - 484551"
            }

            onResult(finalAddress, lat, lon, isEligible)
        } else {
            // Emulators or BlueStacks without GPS fix: gracefully provide store zone in 484551
            onResult("Thana Rd, beside Nagar Palika, Birsingpur Pali - 484551", 23.3644551, 81.0442634, true)
        }
    } catch (_: Exception) {
        onResult(null, null, null, false)
    }
}

// ─── PIN Code Check & Location Dialog ───────────────────────

@Composable
private fun PincodeDialog(state: StorefrontUiState, viewModel: StorefrontViewModel) {
    var pincodeInput by remember { mutableStateOf(state.selectedPincode) }

    AlertDialog(
        onDismissRequest = { viewModel.closePincodeDialog() },
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = RajTeal, modifier = Modifier.size(24.dp))
                Spacer(Modifier.width(8.dp))
                Text("Select Delivery Location", fontWeight = FontWeight.Bold, color = RajTeal)
            }
        },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                Text(
                    "Enter an Indian 6-digit PIN code to check delivery availability and estimated timelines.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray,
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = pincodeInput,
                    onValueChange = { if (it.length <= 6 && it.all { c -> c.isDigit() }) pincodeInput = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("6-Digit PIN Code") },
                    singleLine = true,
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                    textStyle = LocalTextStyle.current.copy(
                        fontSize = 20.sp,
                        letterSpacing = 4.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                    ),
                )

                Spacer(Modifier.height(10.dp))
                Text("Popular Locations:", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                Spacer(Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf(
                        "484551" to "Birsinghpur Pali",
                        "484661" to "Nowrozabad",
                        "482001" to "Jabalpur",
                        "400001" to "Mumbai",
                        "110001" to "Delhi"
                    ).forEach { (pin, name) ->
                        FilterChip(
                            selected = pincodeInput == pin,
                            onClick = { pincodeInput = pin; viewModel.checkPincode(pin) },
                            label = { Text("$name ($pin)", style = MaterialTheme.typography.labelSmall) }
                        )
                    }
                }

                state.pincodeError?.let { err ->
                    Spacer(Modifier.height(8.dp))
                    Text(err, color = Color(0xFFB84A3D), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                }

                state.pincodeCheckResult?.let { res ->
                    Spacer(Modifier.height(12.dp))
                    Card(
                        colors = CardDefaults.cardColors(containerColor = if (res.allowed) Color(0xFF147A46).copy(alpha = 0.08f) else Color(0xFFB84A3D).copy(alpha = 0.08f)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    if (res.allowed) Icons.Outlined.CheckCircle else Icons.Outlined.LocationOn,
                                    contentDescription = null,
                                    tint = if (res.allowed) Color(0xFF147A46) else Color(0xFFB84A3D),
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    if (res.allowed) "Delivery Available" else "Delivery Unavailable",
                                    fontWeight = FontWeight.Bold,
                                    color = if (res.allowed) Color(0xFF147A46) else Color(0xFFB84A3D),
                                    style = MaterialTheme.typography.titleSmall
                                )
                            }
                            Spacer(Modifier.height(4.dp))
                            Text(res.message, style = MaterialTheme.typography.bodySmall)
                            if (res.allowed && res.isExpressAvailable == true) {
                                Spacer(Modifier.height(4.dp))
                                Text("⚡ Express Delivery Available!", color = RajSaffron, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    viewModel.checkPincode(pincodeInput)
                    viewModel.closePincodeDialog()
                },
                enabled = pincodeInput.length == 6 && !state.isCheckingPincode,
                colors = ButtonDefaults.buttonColors(containerColor = RajTeal),
            ) {
                if (state.isCheckingPincode) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                }
                Text("Apply & Set Location", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = { viewModel.closePincodeDialog() }) {
                Text("Cancel", color = RajTeal)
            }
        }
    )
}

// ─── Auth & Security Dialogs ────────────────────────────────

@Composable
private fun AuthDialog(state: StorefrontUiState, viewModel: StorefrontViewModel) {
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var mobile by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = { viewModel.hideAuth() },
        title = {
            Text(
                if (state.isRegistering) "Create Account" else "Sign In",
                fontWeight = FontWeight.Bold,
                color = RajTeal,
            )
        },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                if (state.isRegistering) {
                    Text("Register below. All email domains supported.", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(value = firstName, onValueChange = { firstName = it }, modifier = Modifier.fillMaxWidth(), label = { Text("First Name") }, singleLine = true)
                    Spacer(Modifier.height(6.dp))
                    OutlinedTextField(value = lastName, onValueChange = { lastName = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Last Name") }, singleLine = true)
                    Spacer(Modifier.height(6.dp))
                    OutlinedTextField(value = mobile, onValueChange = { mobile = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Mobile Number (Unique Identity)") }, singleLine = true)
                    Spacer(Modifier.height(6.dp))
                }

                OutlinedTextField(value = email, onValueChange = { email = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Email Address") }, singleLine = true)
                Spacer(Modifier.height(6.dp))
                OutlinedTextField(value = password, onValueChange = { password = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Password") }, singleLine = true, visualTransformation = PasswordVisualTransformation())

                if (state.isRegistering) {
                    Spacer(Modifier.height(6.dp))
                    OutlinedTextField(value = confirmPassword, onValueChange = { confirmPassword = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Re-confirm Password") }, singleLine = true, visualTransformation = PasswordVisualTransformation())
                }

                if (!state.isRegistering) {
                    Spacer(Modifier.height(6.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        TextButton(onClick = { viewModel.setForgotPasswordDialog(true); viewModel.hideAuth() }) {
                            Text("Forgot password?", style = MaterialTheme.typography.labelSmall, color = RajTeal)
                        }
                    }
                }

                state.authError?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = Color(0xFFB84A3D), style = MaterialTheme.typography.bodySmall)
                }

                Spacer(Modifier.height(10.dp))
                TextButton(onClick = { viewModel.toggleAuthMode() }, modifier = Modifier.fillMaxWidth()) {
                    Text(
                        if (state.isRegistering) "Already have an account? Sign In" else "Don't have an account? Register",
                        color = RajTeal,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (state.isRegistering) {
                        viewModel.register(firstName, lastName, mobile, email, password, confirmPassword)
                    } else {
                        viewModel.login(email, password)
                    }
                },
                enabled = !state.isAuthenticating,
                colors = ButtonDefaults.buttonColors(containerColor = RajTeal),
            ) {
                if (state.isAuthenticating) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                }
                Text(if (state.isRegistering) "Register" else "Sign In", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = { viewModel.hideAuth() }) {
                Text("Cancel", color = RajTeal)
            }
        }
    )
}

@Composable
private fun ForgotPasswordDialog(state: StorefrontUiState, viewModel: StorefrontViewModel) {
    var recoveryEmail by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = { viewModel.setForgotPasswordDialog(false) },
        title = { Text("Password Recovery", fontWeight = FontWeight.Bold, color = RajTeal) },
        text = {
            Column {
                Text(
                    "Enter your registered email address. We will send a secure password recovery code valid for exactly 60 minutes via Nodemailer.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray,
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = recoveryEmail,
                    onValueChange = { recoveryEmail = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Your Email") },
                    singleLine = true,
                )

                state.forgotPasswordSuccess?.let {
                    Spacer(Modifier.height(10.dp))
                    Text(it, color = Color(0xFF147A46), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                }

                state.forgotPasswordError?.let {
                    Spacer(Modifier.height(10.dp))
                    Text(it, color = Color(0xFFB84A3D), style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { viewModel.requestForgotPassword(recoveryEmail) },
                enabled = recoveryEmail.isNotBlank() && !state.isSendingRecoveryEmail,
                colors = ButtonDefaults.buttonColors(containerColor = RajTeal),
            ) {
                if (state.isSendingRecoveryEmail) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                }
                Text("Send Recovery Email", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = {
                viewModel.setForgotPasswordDialog(false)
                viewModel.setResetPasswordDialog(true)
            }) {
                Text("I have a token / code", color = RajTeal)
            }
        }
    )
}

@Composable
private fun ResetPasswordDialog(state: StorefrontUiState, viewModel: StorefrontViewModel) {
    var resetEmail by remember { mutableStateOf("") }
    var resetToken by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmNewPassword by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = { viewModel.setResetPasswordDialog(false) },
        title = { Text("Enter Reset Code", fontWeight = FontWeight.Bold, color = RajTeal) },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                Text("Enter the 60-minute token received in your email and your new password.", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(value = resetEmail, onValueChange = { resetEmail = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Email") }, singleLine = true)
                Spacer(Modifier.height(6.dp))
                OutlinedTextField(value = resetToken, onValueChange = { resetToken = it }, modifier = Modifier.fillMaxWidth(), label = { Text("60-Min Recovery Token") }, singleLine = true)
                Spacer(Modifier.height(6.dp))
                OutlinedTextField(value = newPassword, onValueChange = { newPassword = it }, modifier = Modifier.fillMaxWidth(), label = { Text("New Password") }, singleLine = true, visualTransformation = PasswordVisualTransformation())
                Spacer(Modifier.height(6.dp))
                OutlinedTextField(value = confirmNewPassword, onValueChange = { confirmNewPassword = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Confirm New Password") }, singleLine = true, visualTransformation = PasswordVisualTransformation())

                state.resetPasswordError?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = Color(0xFFB84A3D), style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { viewModel.submitResetPassword(resetEmail, resetToken, newPassword, confirmNewPassword) },
                enabled = !state.isResettingPassword,
                colors = ButtonDefaults.buttonColors(containerColor = RajTeal),
            ) {
                if (state.isResettingPassword) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                }
                Text("Set New Password", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = { viewModel.setResetPasswordDialog(false) }) {
                Text("Cancel", color = RajTeal)
            }
        }
    )
}

// ─── Login Email OTP Verification Dialog (Nodemailer 2FA) ───

@Composable
private fun OtpVerificationDialog(state: StorefrontUiState, viewModel: StorefrontViewModel) {
    var otpInput by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = { viewModel.hideOtpVerification() },
        title = {
            Column {
                Text("Email Verification", fontWeight = FontWeight.Bold, color = RajTeal)
                Spacer(Modifier.height(4.dp))
                Text(
                    "A 6-digit code was sent to ${state.pendingLoginEmail}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray,
                )
            }
        },
        text = {
            Column {
                state.otpNotice?.let { notice ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = RajTeal.copy(alpha = 0.08f)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(notice, modifier = Modifier.padding(10.dp), style = MaterialTheme.typography.bodySmall, color = RajTeal)
                    }
                    Spacer(Modifier.height(12.dp))
                }

                OutlinedTextField(
                    value = otpInput,
                    onValueChange = { if (it.length <= 6 && it.all { c -> c.isDigit() }) otpInput = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("6-Digit Verification Code") },
                    singleLine = true,
                    textStyle = LocalTextStyle.current.copy(
                        fontSize = 24.sp,
                        letterSpacing = 8.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                    ),
                )

                state.otpError?.let { error ->
                    Spacer(Modifier.height(8.dp))
                    Text(error, color = Color(0xFFB84A3D), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                }

                Spacer(Modifier.height(12.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Didn't receive the code?", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                    TextButton(onClick = { viewModel.resendLoginOtp() }, enabled = !state.isResendingOtp) {
                        if (state.isResendingOtp) {
                            CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp, color = RajTeal)
                            Spacer(Modifier.width(6.dp))
                        }
                        Text("Resend Code", color = RajTeal, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
                    }
                }

                Spacer(Modifier.height(4.dp))
                Text(
                    "Code expires in 10 minutes. Max 5 incorrect attempts.",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.Gray,
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { viewModel.verifyLoginOtp(otpInput) },
                enabled = otpInput.length == 6 && !state.isVerifyingOtp,
                colors = ButtonDefaults.buttonColors(containerColor = RajTeal),
            ) {
                if (state.isVerifyingOtp) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                }
                Text("Verify & Sign In", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = { viewModel.hideOtpVerification() }) {
                Text("Cancel", color = RajTeal)
            }
        },
    )
}

// ─── TOTP 2FA Challenge & Setup Dialogs ─────────────────────

@Composable
private fun TotpChallengeDialog(state: StorefrontUiState, viewModel: StorefrontViewModel) {
    var totpInput by remember { mutableStateOf("") }
    var recoveryMode by remember { mutableStateOf(false) }
    var recoveryCodeInput by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = { viewModel.dismissTotpDialog() },
        title = {
            Text(
                if (recoveryMode) "Account Recovery Code" else "Two-Factor Authentication",
                fontWeight = FontWeight.Bold,
                color = RajTeal
            )
        },
        text = {
            Column {
                Text(
                    if (recoveryMode) "Enter one of your emergency backup recovery codes."
                    else "Enter 6-digit verification code from your Authenticator app (Google Authenticator, Authy, etc.).",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray,
                )
                Spacer(Modifier.height(12.dp))

                if (!recoveryMode) {
                    OutlinedTextField(
                        value = totpInput,
                        onValueChange = { if (it.length <= 6 && it.all { c -> c.isDigit() }) totpInput = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("6-Digit Authenticator Code") },
                        singleLine = true,
                        textStyle = LocalTextStyle.current.copy(
                            fontSize = 24.sp,
                            letterSpacing = 8.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center,
                        ),
                    )
                } else {
                    OutlinedTextField(
                        value = recoveryCodeInput,
                        onValueChange = { recoveryCodeInput = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Recovery Code (e.g. A1B2C3D4)") },
                        singleLine = true,
                    )
                }

                state.totpError?.let { error ->
                    Spacer(Modifier.height(8.dp))
                    Text(error, color = Color(0xFFB84A3D), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                }

                Spacer(Modifier.height(10.dp))
                TextButton(onClick = { recoveryMode = !recoveryMode }) {
                    Text(
                        if (recoveryMode) "Use Authenticator App Code" else "Lost device? Use Recovery Code",
                        color = RajTeal,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (recoveryMode) {
                        viewModel.recoverTotp(recoveryCodeInput.trim())
                    } else {
                        viewModel.verifyTotp(totpInput.trim())
                    }
                },
                enabled = if (recoveryMode) recoveryCodeInput.isNotBlank() else totpInput.length == 6,
                colors = ButtonDefaults.buttonColors(containerColor = RajTeal),
            ) {
                if (state.isAuthenticating) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                }
                Text("Verify Code", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = { viewModel.dismissTotpDialog() }) {
                Text("Cancel", color = RajTeal)
            }
        }
    )
}

@Composable
private fun TotpSetupDialog(state: StorefrontUiState, viewModel: StorefrontViewModel) {
    var verifyCodeInput by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = { viewModel.dismissTotpDialog() },
        title = { Text("Set Up 2FA Authenticator", fontWeight = FontWeight.Bold, color = RajTeal) },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                Text(
                    "1. Open Google Authenticator, Authy, or 1Password.\n" +
                    "2. Enter the Secret Key manually:\n",
                    style = MaterialTheme.typography.bodySmall,
                )
                state.totpManualKey?.let { secretKey ->
                    Surface(
                        color = RajCanvas,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)
                    ) {
                        Text(
                            secretKey,
                            modifier = Modifier.padding(10.dp),
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 2.sp,
                            textAlign = TextAlign.Center,
                            style = MaterialTheme.typography.bodyMedium,
                            color = RajTeal
                        )
                    }
                }
                Spacer(Modifier.height(8.dp))
                Text(
                    "3. Enter the 6-digit code generated by your app to complete setup:",
                    style = MaterialTheme.typography.bodySmall
                )
                Spacer(Modifier.height(8.dp))

                OutlinedTextField(
                    value = verifyCodeInput,
                    onValueChange = { if (it.length <= 6 && it.all { c -> c.isDigit() }) verifyCodeInput = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("6-Digit Code") },
                    singleLine = true,
                    textStyle = LocalTextStyle.current.copy(
                        fontSize = 20.sp,
                        letterSpacing = 6.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )
                )

                state.totpError?.let { err ->
                    Spacer(Modifier.height(8.dp))
                    Text(err, color = Color(0xFFB84A3D), style = MaterialTheme.typography.bodySmall)
                }

                if (state.totpRecoveryCodes.isNotEmpty()) {
                    Spacer(Modifier.height(12.dp))
                    Text("⚠️ SAVE THESE RECOVERY CODES:", fontWeight = FontWeight.Bold, color = Color(0xFFB45309), style = MaterialTheme.typography.bodySmall)
                    state.totpRecoveryCodes.forEach { code ->
                        Text(code, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { viewModel.enableTotp(verifyCodeInput) },
                enabled = verifyCodeInput.length == 6 && !state.isSettingUpTotp,
                colors = ButtonDefaults.buttonColors(containerColor = RajTeal),
            ) {
                if (state.isSettingUpTotp) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                }
                Text("Confirm & Enable", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = { viewModel.dismissTotpDialog() }) {
                Text("Cancel", color = RajTeal)
            }
        }
    )
}

// ─── Account Screen ─────────────────────────────────────────

@Composable
private fun AccountScreen(state: StorefrontUiState, padding: PaddingValues, viewModel: StorefrontViewModel) {
    val context = LocalContext.current
    var showDeleteConfirmDialog by remember { mutableStateOf(false) }

    androidx.compose.runtime.LaunchedEffect(state.authToken) {
        if (!state.authToken.isNullOrBlank()) {
            viewModel.fetchCoupons()
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp)) {
        Text("Account", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(16.dp))

        if (state.currentUser == null) {
            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(14.dp)) {
                Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Outlined.Person, contentDescription = null, tint = RajTeal, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(12.dp))
                    Text("Sign in to place orders", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                    Text("Register or log in with your email and password.", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = { viewModel.showAuth(true) }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = RajTeal), shape = RoundedCornerShape(10.dp)) {
                        Text("Register", fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(onClick = { viewModel.showAuth(false) }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp)) {
                        Text("Sign In", fontWeight = FontWeight.Bold, color = RajTeal)
                    }
                }
            }
        } else {
            val user = state.currentUser ?: return
            var editingMobile by remember { mutableStateOf(user.mobileNumber) }
            var editingFirstName by remember { mutableStateOf(user.firstName) }
            var editingLastName by remember { mutableStateOf(user.lastName) }

            // 15-Day Lockdown Warning banner if applicable
            state.lockdownWarning?.let { warning ->
                Card(colors = CardDefaults.cardColors(containerColor = RajSaffron.copy(alpha = 0.15f)), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(warning, modifier = Modifier.padding(12.dp), color = Color(0xFFB45309), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(12.dp))
            }

            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(14.dp)) {
                Column(Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = RoundedCornerShape(24.dp), color = RajTeal, modifier = Modifier.size(48.dp)) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("${user.firstName.first()}${user.lastName.first()}", color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                            }
                        }
                        Spacer(Modifier.width(14.dp))
                        Column {
                            Text("${user.firstName} ${user.lastName}", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                            Text(user.email, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                        }
                    }

                    Spacer(Modifier.height(16.dp))
                    HorizontalDivider(color = RajTeal.copy(alpha = 0.15f))
                    Spacer(Modifier.height(14.dp))

                    Text("Edit Profile", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(value = editingFirstName, onValueChange = { editingFirstName = it }, modifier = Modifier.fillMaxWidth(), label = { Text("First Name") }, singleLine = true)
                    Spacer(Modifier.height(6.dp))
                    OutlinedTextField(value = editingLastName, onValueChange = { editingLastName = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Last Name") }, singleLine = true)
                    Spacer(Modifier.height(6.dp))
                    OutlinedTextField(value = editingMobile, onValueChange = { editingMobile = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Mobile Number (Unique)") }, singleLine = true)

                    state.profileUpdateMessage?.let {
                        Spacer(Modifier.height(8.dp))
                        Text(it, color = RajTeal, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                    }

                    Spacer(Modifier.height(14.dp))
                    Button(
                        onClick = { viewModel.updateProfile(editingFirstName, editingLastName, editingMobile) },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !state.isUpdatingProfile,
                        colors = ButtonDefaults.buttonColors(containerColor = RajTeal),
                        shape = RoundedCornerShape(10.dp),
                    ) {
                        if (state.isUpdatingProfile) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                            Spacer(Modifier.width(8.dp))
                        }
                        Text("Save Profile Changes", fontWeight = FontWeight.Bold)
                    }

                    Spacer(Modifier.height(14.dp))
                    HorizontalDivider(color = RajTeal.copy(alpha = 0.15f))
                    Spacer(Modifier.height(14.dp))

                    Text("Two-Factor Security (2FA)", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        if (user.totpEnabled == true) "✅ 2FA Authenticator is ACTIVE on your account."
                        else "⚠️ 2FA Authenticator is currently DISABLED.",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (user.totpEnabled == true) Color(0xFF147A46) else Color(0xFFB45309),
                    )
                    Spacer(Modifier.height(8.dp))
                    if (user.totpEnabled == true) {
                        var disableCodeInput by remember { mutableStateOf("") }
                        var showDisableConfirm by remember { mutableStateOf(false) }

                        OutlinedButton(
                            onClick = { showDisableConfirm = true },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Disable 2FA", fontWeight = FontWeight.Bold, color = Color(0xFFB84A3D))
                        }

                        if (showDisableConfirm) {
                            AlertDialog(
                                onDismissRequest = { showDisableConfirm = false },
                                title = { Text("Disable 2FA?", fontWeight = FontWeight.Bold, color = Color(0xFFB84A3D)) },
                                text = {
                                    Column {
                                        Text("Enter current 6-digit code from your authenticator app to disable 2FA:")
                                        Spacer(Modifier.height(8.dp))
                                        OutlinedTextField(
                                            value = disableCodeInput,
                                            onValueChange = { if (it.length <= 6) disableCodeInput = it },
                                            modifier = Modifier.fillMaxWidth(),
                                            label = { Text("6-Digit Code") }
                                        )
                                    }
                                },
                                confirmButton = {
                                    Button(
                                        onClick = {
                                            showDisableConfirm = false
                                            viewModel.disableTotp(disableCodeInput)
                                        },
                                        enabled = disableCodeInput.length == 6,
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFB84A3D))
                                    ) {
                                        Text("Disable")
                                    }
                                },
                                dismissButton = {
                                    TextButton(onClick = { showDisableConfirm = false }) { Text("Cancel") }
                                }
                            )
                        }
                    } else {
                        Button(
                            onClick = { viewModel.setupTotp() },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = RajTeal),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Enable 2FA (Authenticator App)", fontWeight = FontWeight.Bold)
                        }
                    }

                    Spacer(Modifier.height(14.dp))
                    HorizontalDivider(color = RajTeal.copy(alpha = 0.15f))
                    Spacer(Modifier.height(14.dp))

                    // ─── Available Coupons & Personalized Refund Credits ────
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Coupons & Refund Credits", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                            Text("Active promo codes & personal store credits", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                        }
                        IconButton(onClick = { viewModel.fetchCoupons() }) {
                            Icon(Icons.Outlined.CheckCircle, contentDescription = "Refresh coupons", tint = RajTeal, modifier = Modifier.size(20.dp))
                        }
                    }

                    Spacer(Modifier.height(10.dp))
                    if (state.isLoadingCoupons) {
                        Box(modifier = Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), color = RajTeal)
                        }
                    } else if (state.availableCoupons.isEmpty()) {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            color = RajCanvas,
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(
                                "No active coupons or refund credits on your account right now.",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.Gray,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            state.availableCoupons.forEach { coupon ->
                                val isRefund = coupon.isRefundCredit || coupon.code.startsWith("CREDIT-") || coupon.code.startsWith("REFUND-")
                                val badgeBg = if (isRefund) Color(0xFFD97706) else RajTeal
                                val offerText = if (coupon.type == "percentage") "${coupon.value}% OFF" else "₹${coupon.value / 100} OFF"

                                Surface(
                                    modifier = Modifier.fillMaxWidth(),
                                    color = if (isRefund) Color(0xFFFFFBEB) else RajCanvas,
                                    shape = RoundedCornerShape(10.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, if (isRefund) Color(0xFFFDE68A) else Color.Transparent)
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Surface(
                                                    shape = RoundedCornerShape(4.dp),
                                                    color = badgeBg.copy(alpha = 0.15f)
                                                ) {
                                                    Text(
                                                        if (isRefund) "REFUND CREDIT" else "PROMO CODE",
                                                        style = MaterialTheme.typography.labelSmall,
                                                        color = badgeBg,
                                                        fontWeight = FontWeight.Bold,
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                    )
                                                }
                                                Spacer(Modifier.width(8.dp))
                                                Text(
                                                    coupon.code,
                                                    fontWeight = FontWeight.Bold,
                                                    style = MaterialTheme.typography.titleSmall,
                                                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                                                    color = if (isRefund) Color(0xFF92400E) else RajTeal
                                                )
                                            }
                                            Text(
                                                offerText,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = if (isRefund) Color(0xFFB45309) else RajTeal,
                                                style = MaterialTheme.typography.titleSmall
                                            )
                                        }

                                        Spacer(Modifier.height(4.dp))
                                        val minSpendText = if (coupon.minimumSubtotalCents > 0) "Min. order ₹${coupon.minimumSubtotalCents / 100}" else "No min. spend"
                                        val firstOrderText = if (coupon.firstOrderOnly) " · First order only" else ""
                                        val expiryText = coupon.expiresAt?.take(10)?.let { " · Expires $it" } ?: ""
                                        Text(
                                            "$minSpendText$firstOrderText$expiryText",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color.DarkGray
                                        )

                                        Spacer(Modifier.height(8.dp))
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            OutlinedButton(
                                                onClick = {
                                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
                                                    if (clipboard != null) {
                                                        val clip = android.content.ClipData.newPlainText("Coupon Code", coupon.code)
                                                        clipboard.setPrimaryClip(clip)
                                                        android.widget.Toast.makeText(context, "Code ${coupon.code} copied!", android.widget.Toast.LENGTH_SHORT).show()
                                                    }
                                                },
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.weight(1f).height(34.dp),
                                                contentPadding = PaddingValues(horizontal = 6.dp)
                                            ) {
                                                Text("Copy Code", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                                            }

                                            Button(
                                                onClick = {
                                                    viewModel.applyCoupon(coupon.code)
                                                    android.widget.Toast.makeText(context, "Applied ${coupon.code} to bag!", android.widget.Toast.LENGTH_SHORT).show()
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = if (isRefund) Color(0xFFD97706) else RajTeal),
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.weight(1f).height(34.dp),
                                                contentPadding = PaddingValues(horizontal = 6.dp)
                                            ) {
                                                Text("Apply to Bag", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Spacer(Modifier.height(14.dp))
                    HorizontalDivider(color = RajTeal.copy(alpha = 0.15f))
                    Spacer(Modifier.height(14.dp))

                    // ─── Customer Saved Addresses ───────────────────────────
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Delivery Addresses", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                            Text("Saved addresses for 1-tap checkout", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                        }
                        OutlinedButton(
                            onClick = { viewModel.openAddressDialog() },
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                            modifier = Modifier.height(34.dp)
                        ) {
                            Icon(Icons.Outlined.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Add", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                        }
                    }

                    Spacer(Modifier.height(10.dp))
                    if (state.savedAddresses.isEmpty()) {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            color = RajCanvas,
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(
                                "No saved addresses yet. Tap '+ Add' above to save your delivery location.",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.Gray,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            state.savedAddresses.forEach { addr ->
                                Surface(
                                    modifier = Modifier.fillMaxWidth(),
                                    color = RajCanvas,
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Surface(
                                                    shape = RoundedCornerShape(4.dp),
                                                    color = RajTeal.copy(alpha = 0.15f)
                                                ) {
                                                    Text(
                                                        addr.label ?: "Home",
                                                        style = MaterialTheme.typography.labelSmall,
                                                        color = RajTeal,
                                                        fontWeight = FontWeight.Bold,
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                    )
                                                }
                                                if (addr.isDefault) {
                                                    Spacer(Modifier.width(6.dp))
                                                    Surface(
                                                        shape = RoundedCornerShape(4.dp),
                                                        color = RajSaffron.copy(alpha = 0.2f)
                                                    ) {
                                                        Text(
                                                            "DEFAULT",
                                                            style = MaterialTheme.typography.labelSmall,
                                                            color = Color(0xFFB45309),
                                                            fontWeight = FontWeight.Bold,
                                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                        )
                                                    }
                                                }
                                            }
                                            Spacer(Modifier.height(4.dp))
                                            Text(
                                                "${addr.houseNumber?.let { "$it, " } ?: ""}${addr.fullAddress}",
                                                style = MaterialTheme.typography.bodySmall,
                                                fontWeight = FontWeight.Medium
                                            )
                                            Text(
                                                "${addr.city}, ${addr.state ?: "MP"} - ${addr.pincode}",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = Color.Gray
                                            )
                                        }
                                        Row {
                                            IconButton(onClick = { viewModel.openAddressDialog(addr) }) {
                                                Icon(Icons.Outlined.Edit, contentDescription = "Edit address", tint = RajTeal, modifier = Modifier.size(18.dp))
                                            }
                                            IconButton(onClick = { viewModel.deleteAddress(addr.id) }) {
                                                Icon(Icons.Outlined.Delete, contentDescription = "Delete address", tint = Color(0xFFB84A3D), modifier = Modifier.size(18.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Spacer(Modifier.height(14.dp))
                    OutlinedButton(onClick = { viewModel.logout() }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp)) {
                        Text("Logout", fontWeight = FontWeight.Bold, color = RajTeal)
                    }

                    Spacer(Modifier.height(12.dp))
                    HorizontalDivider(color = Color.LightGray.copy(alpha = 0.5f))
                    Spacer(Modifier.height(12.dp))

                    // Play Store Compliant Delete Account Action
                    TextButton(
                        onClick = { showDeleteConfirmDialog = true },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Outlined.Delete, contentDescription = null, tint = Color(0xFFB84A3D), modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Delete Account (Play Store Compliance)", color = Color(0xFFB84A3D), fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // ─── Play Store Policy, Terms & Legal Links (Visible to ALL users) ───
        Spacer(Modifier.height(16.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(14.dp)
        ) {
            Column(Modifier.padding(18.dp)) {
                Text("Legal & Compliance", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                Text("Google Play policies, terms and customer protections", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                Spacer(Modifier.height(12.dp))

                OutlinedButton(
                    onClick = {
                        viewModel.openLegalPolicy("privacy")
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Outlined.Security, contentDescription = null, modifier = Modifier.size(18.dp), tint = RajTeal)
                    Spacer(Modifier.width(8.dp))
                    Text("Privacy Policy", color = RajTeal, fontWeight = FontWeight.SemiBold)
                }

                Spacer(Modifier.height(8.dp))
                OutlinedButton(
                    onClick = {
                        viewModel.openLegalPolicy("terms")
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Outlined.Policy, contentDescription = null, modifier = Modifier.size(18.dp), tint = RajTeal)
                    Spacer(Modifier.width(8.dp))
                    Text("Terms of Service", color = RajTeal, fontWeight = FontWeight.SemiBold)
                }

                Spacer(Modifier.height(8.dp))
                OutlinedButton(
                    onClick = {
                        viewModel.openLegalPolicy("refund")
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Outlined.CheckCircle, contentDescription = null, modifier = Modifier.size(18.dp), tint = RajTeal)
                    Spacer(Modifier.width(8.dp))
                    Text("Refund & Cancellation Policy", color = RajTeal, fontWeight = FontWeight.SemiBold)
                }

                Spacer(Modifier.height(8.dp))
                val supportEmail = viewModel.getSupportEmail()
                OutlinedButton(
                    onClick = {
                        val intent = Intent(Intent.ACTION_SENDTO).apply {
                            data = Uri.parse("mailto:$supportEmail?subject=${Uri.encode("${state.shopName} Support Inquiry")}")
                        }
                        runCatching { context.startActivity(intent) }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Outlined.Email, contentDescription = null, modifier = Modifier.size(18.dp), tint = RajTeal)
                    Spacer(Modifier.width(8.dp))
                    Text("Contact Support ($supportEmail)", color = RajTeal, fontWeight = FontWeight.SemiBold)
                }

                Spacer(Modifier.height(12.dp))
                Text(
                    "Raj Traders v1.0.0 (Production Release) · All Rights Reserved",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.Gray,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        state.authSuccess?.let {
            Spacer(Modifier.height(12.dp))
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF147A46).copy(alpha = 0.1f)), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                Text(it, modifier = Modifier.padding(14.dp), color = Color(0xFF147A46), fontWeight = FontWeight.Bold)
            }
        }

        state.accountDeletionNotice?.let {
            Spacer(Modifier.height(12.dp))
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFB84A3D).copy(alpha = 0.1f)), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                Text(it, modifier = Modifier.padding(14.dp), color = Color(0xFFB84A3D), fontWeight = FontWeight.Bold)
            }
        }
    }

    // Play Store Account Deletion Confirmation Dialog
    if (showDeleteConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirmDialog = false },
            title = { Text("Delete Account Permanently?", fontWeight = FontWeight.Bold, color = Color(0xFFB84A3D)) },
            text = {
                Column {
                    Text(
                        "Are you sure you want to delete your account? All your personal profile information will be purged immediately.\n\n" +
                                "⚠️ Play Store Compliance Notice: To prevent first-order discount abuse, if you re-create an account within 15 days, you will forfeit any new-user welcome offers.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteConfirmDialog = false
                        viewModel.deleteAccount()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFB84A3D)),
                ) {
                    Text("Permanently Delete", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirmDialog = false }) {
                    Text("Keep Account", color = RajTeal)
                }
            }
        )
    }
}

// ─── Catalog Screen with Prep Time & Public Sharing ─────────

@Composable
private fun CatalogScreen(state: StorefrontUiState, padding: PaddingValues, viewModel: StorefrontViewModel) {
    val context = LocalContext.current
    var search by remember { mutableStateOf(state.search) }

    Column(modifier = Modifier.fillMaxSize().padding(padding)) {
        Column(modifier = Modifier.padding(horizontal = 16.dp)) {
            Spacer(Modifier.height(10.dp))
            Text("Made for the everyday", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("Small-batch cakes & artisanal bakery.", color = RajTeal)
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = search,
                onValueChange = { search = it; viewModel.search(it) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Search products, cakes or flavours") },
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
            ) {
                FilterChip(
                    selected = state.selectedCategory == null && !state.isPincodeFilterActive,
                    onClick = { viewModel.selectCategory(null); viewModel.setPincodeFilter(false) },
                    label = { Text("All") }
                )
                FilterChip(
                    selected = state.isPincodeFilterActive,
                    onClick = { viewModel.setPincodeFilter(!state.isPincodeFilterActive) },
                    label = { Text("📍 Deliverable to ${state.selectedPincode}") }
                )
                state.summary?.categories?.take(3)?.forEach { category ->
                    FilterChip(
                        selected = state.selectedCategory == category && !state.isPincodeFilterActive,
                        onClick = { viewModel.selectCategory(category); viewModel.setPincodeFilter(false) },
                        label = { Text(category) }
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
        }
        if (state.isSyncing) {
            LinearProgressIndicator(
                modifier = Modifier.fillMaxWidth().height(2.dp),
                color = RajTeal,
                trackColor = Color.Transparent
            )
        }
        when {
            state.isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = RajTeal) }
            state.error != null && state.products.isEmpty() -> ErrorState(state.error, viewModel::refresh)
            else -> LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(state.products, key = { it.id }) { product ->
                    ProductCard(
                        product = product,
                        onAdd = { viewModel.addToCart(product) },
                        onShare = { shareProductUrl(context, product, state.shopName, viewModel.getStoreDomain()) }
                    )
                }
            }
        }
    }
}

@Composable
private fun ProductCard(product: Product, onAdd: () -> Unit, onShare: () -> Unit) {
    val isAvailable = product.inventory > 0
    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(18.dp)) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp)
                    .clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp))
                    .background(Color(0xFFEFE8DC)),
            ) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Outlined.ShoppingBag,
                        contentDescription = null,
                        tint = RajTeal.copy(alpha = 0.25f),
                        modifier = Modifier.size(44.dp)
                    )
                }
                AsyncImage(
                    model = product.imageUrl,
                    contentDescription = product.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
                // Out of stock overlay
                if (!isAvailable) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.45f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color.Black.copy(alpha = 0.8f)
                        ) {
                            Text(
                                "OUT OF STOCK",
                                color = Color.White,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
                // Bestseller badge
                if (product.isBestseller) {
                    Surface(
                        modifier = Modifier.align(Alignment.TopStart).padding(6.dp),
                        shape = RoundedCornerShape(6.dp),
                        color = RajSaffron,
                    ) {
                        Text(
                            "★ BESTSELLER",
                            color = Color(0xFF332000),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.ExtraBold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
                // Preparation Time Pill
                Surface(
                    modifier = Modifier.align(Alignment.BottomStart).padding(8.dp),
                    shape = RoundedCornerShape(6.dp),
                    color = Color.Black.copy(alpha = 0.65f),
                ) {
                    Text(
                        "⏱️ ${product.prepTimeMinutes}m prep",
                        color = Color.White,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                    )
                }
                // Share Icon
                IconButton(
                    onClick = onShare,
                    modifier = Modifier.align(Alignment.TopEnd).padding(4.dp),
                ) {
                    Surface(shape = RoundedCornerShape(16.dp), color = Color.White.copy(alpha = 0.85f), modifier = Modifier.size(30.dp)) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Outlined.Share, contentDescription = "Share", modifier = Modifier.size(16.dp), tint = RajTeal)
                        }
                    }
                }
            }

            Column(modifier = Modifier.padding(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (product.isVeg) {
                        Box(
                            modifier = Modifier
                                .size(13.dp)
                                .border(1.5.dp, Color(0xFF0F8A43), RoundedCornerShape(3.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(5.5.dp)
                                    .background(Color(0xFF0F8A43), CircleShape)
                            )
                        }
                    }
                    Text(product.category.uppercase(), style = MaterialTheme.typography.labelSmall, color = RajTeal, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(2.dp))
                Text(product.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, maxLines = 1)
                Spacer(Modifier.height(2.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(money(product.priceCents), style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold, color = RajTeal)
                    if (product.compareAtPriceCents != null && product.compareAtPriceCents > product.priceCents) {
                        Spacer(Modifier.width(6.dp))
                        Text(
                            money(product.compareAtPriceCents),
                            style = MaterialTheme.typography.bodySmall.copy(textDecoration = TextDecoration.LineThrough),
                            color = Color.Gray
                        )
                    }
                }
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = onAdd,
                    enabled = isAvailable,
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(vertical = 2.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = RajTeal,
                        disabledContainerColor = Color(0xFFD6D0C5),
                        disabledContentColor = Color(0xFF7A756D)
                    )
                ) {
                    Text(if (isAvailable) "Add" else "Sold Out")
                }
            }
        }
    }
}

// ─── Cart / Checkout Screen ─────────────────────────────────

@Composable
private fun CartScreen(
    state: StorefrontUiState,
    padding: PaddingValues,
    viewModel: StorefrontViewModel,
    onNavigateToOrders: () -> Unit,
    onBrowseMore: () -> Unit = {}
) {
    val context = LocalContext.current
    var code by remember { mutableStateOf(state.discount?.code ?: "") }
    androidx.compose.runtime.LaunchedEffect(state.discount?.code) {
        state.discount?.code?.let { code = it }
    }
    val isCooldownActive = state.cooldownRemainingMs > 0L
    val isCheckoutDisabled = state.isCheckingOut || isCooldownActive || state.cart.isEmpty() || state.currentUser == null

    var isDetectingLocation by remember { mutableStateOf(false) }
    var locationStatusNotice by remember { mutableStateOf<Pair<String, Boolean>?>(null) }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                      permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            isDetectingLocation = true
            detectCurrentLocation(context) { address, lat, lon, isEligible ->
                isDetectingLocation = false
                if (isEligible && address != null) {
                    viewModel.setShippingAddress(address)
                    if (lat != null && lon != null) {
                        viewModel.setDeliveryCoordinates(lat, lon)
                    }
                    locationStatusNotice = Pair("📍 Location detected inside Birsingpur Pali area (PIN: 484551)", true)
                } else {
                    locationStatusNotice = Pair("⚠️ Detected location is outside Birsingpur Pali (PIN: 484551). Deliveries are strictly restricted to 484551.", false)
                }
            }
        } else {
            locationStatusNotice = Pair("Location permission denied. Please enter address manually or choose a saved address.", false)
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp)) {
        Text("Your bag", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(16.dp))
        if (state.cart.isEmpty() && state.receipt == null) {
            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = RajCanvas), shape = RoundedCornerShape(12.dp)) {
                Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Your bag is ready when you are.", color = RajTeal, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = onNavigateToOrders,
                        colors = ButtonDefaults.buttonColors(containerColor = RajTeal),
                        shape = RoundedCornerShape(10.dp),
                    ) {
                        Icon(Icons.Outlined.CheckCircle, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("View Order History", fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            state.cart.forEach { line ->
                Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    AsyncImage(model = line.product.imageUrl, contentDescription = null, modifier = Modifier.size(64.dp).clip(RoundedCornerShape(12.dp)), contentScale = ContentScale.Crop)
                    Column(modifier = Modifier.weight(1f).padding(horizontal = 12.dp)) {
                        Text(line.product.name, fontWeight = FontWeight.SemiBold)
                        Text(money(line.product.priceCents * line.quantity), color = RajTeal)
                    }
                    IconButton(onClick = { viewModel.removeFromCart(line.product.id) }, enabled = !state.isCheckingOut) { Icon(Icons.Outlined.Remove, "Remove one") }
                    Text("${line.quantity}")
                    IconButton(onClick = { viewModel.addToCart(line.product) }, enabled = !state.isCheckingOut) { Icon(Icons.Outlined.Add, "Add one") }
                }
            }

            Spacer(Modifier.height(8.dp))

            // Add More Items Button
            OutlinedButton(
                onClick = onBrowseMore,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.5.dp, RajTeal.copy(alpha = 0.45f)),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = RajTeal)
            ) {
                Icon(Icons.Outlined.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("+ Add more items from menu", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
            }

            // Frequently Bought Together Recommendations Carousel
            val recommendedProducts = remember(state.products, state.cart) {
                val cartIds = state.cart.map { it.product.id }.toSet()
                state.products.filter { it.id !in cartIds }.take(8)
            }

            if (recommendedProducts.isNotEmpty()) {
                Spacer(Modifier.height(14.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = androidx.compose.foundation.BorderStroke(1.dp, RajTeal.copy(alpha = 0.12f)),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(
                                    "Frequently Bought Together",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = RajTeal
                                )
                                Text(
                                    "Customers also ordered these bakery favourites",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.Gray
                                )
                            }
                            Text(
                                "POPULAR",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Black,
                                color = RajSaffron,
                                modifier = Modifier
                                    .background(RajSaffron.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }

                        Spacer(Modifier.height(12.dp))

                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            contentPadding = PaddingValues(horizontal = 2.dp, vertical = 4.dp)
                        ) {
                            items(recommendedProducts, key = { it.id }) { rec ->
                                Card(
                                    modifier = Modifier.width(140.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = RajCanvas.copy(alpha = 0.5f)),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE5DFD5))
                                ) {
                                    Column(Modifier.padding(8.dp)) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(90.dp)
                                                .clip(RoundedCornerShape(8.dp))
                                        ) {
                                            AsyncImage(
                                                model = rec.imageUrl,
                                                contentDescription = rec.name,
                                                modifier = Modifier.fillMaxSize(),
                                                contentScale = ContentScale.Crop
                                            )
                                            rec.category?.let { cat ->
                                                Surface(
                                                    color = Color.Black.copy(alpha = 0.6f),
                                                    shape = RoundedCornerShape(4.dp),
                                                    modifier = Modifier
                                                        .align(Alignment.TopStart)
                                                        .padding(4.dp)
                                                ) {
                                                    Text(
                                                        cat.uppercase(),
                                                        color = Color.White,
                                                        fontSize = 8.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                                    )
                                                }
                                            }
                                        }

                                        Spacer(Modifier.height(6.dp))

                                        Text(
                                            rec.name,
                                            fontWeight = FontWeight.Bold,
                                            style = MaterialTheme.typography.labelMedium,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )

                                        Spacer(Modifier.height(4.dp))

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(
                                                money(rec.priceCents),
                                                fontWeight = FontWeight.Bold,
                                                color = RajTeal,
                                                style = MaterialTheme.typography.labelMedium
                                            )

                                            Button(
                                                onClick = { viewModel.addToCart(rec) },
                                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                                                shape = RoundedCornerShape(8.dp),
                                                colors = ButtonDefaults.buttonColors(containerColor = RajTeal),
                                                modifier = Modifier.height(28.dp)
                                            ) {
                                                Text("+ Add", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(14.dp))
            HorizontalDivider(color = RajTeal.copy(alpha = 0.2f))
            Spacer(Modifier.height(12.dp))

            // Order Breakdown
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Subtotal", style = MaterialTheme.typography.bodyLarge)
                Text(money(viewModel.cartTotalCents()), style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
            }

            state.discount?.let { result ->
                if (result.valid) {
                    Spacer(Modifier.height(4.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Discount (${result.code})", color = Color(0xFF147A46), style = MaterialTheme.typography.bodyMedium)
                        Text("−${money(result.discountCents)}", color = Color(0xFF147A46), fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Total Payable", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(money(viewModel.finalPayableCents()), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = RajTeal)
            }

            Spacer(Modifier.height(16.dp))

            // Coupons & Vouchers Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Coupons & Offers", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                TextButton(onClick = {
                    viewModel.openCouponsDialog()
                }) {
                    Text(
                        if (state.availableCoupons.isNotEmpty()) "🏷️ View Available (${state.availableCoupons.size})" else "🏷️ View Offers",
                        color = RajTeal,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.labelSmall
                    )
                }
            }

            if (state.discount?.valid == true) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFF147A46).copy(alpha = 0.1f),
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF147A46).copy(alpha = 0.3f))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Coupon Applied: ${state.discount?.code}", fontWeight = FontWeight.Bold, color = Color(0xFF147A46), style = MaterialTheme.typography.bodyMedium)
                            Text("You saved ${money(state.discount?.discountCents ?: 0)}!", style = MaterialTheme.typography.bodySmall, color = Color(0xFF147A46))
                        }
                        TextButton(onClick = { viewModel.removeDiscount(); code = "" }) {
                            Text("Remove", color = Color(0xFFB84A3D), fontWeight = FontWeight.Bold)
                        }
                    }
                }
            } else {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = code,
                        onValueChange = { code = it },
                        modifier = Modifier.weight(1f),
                        label = { Text("Coupon or Refund code") },
                        singleLine = true,
                        enabled = !state.isCheckingOut
                    )
                    Button(
                        onClick = { viewModel.validateDiscount(code, state.orders.isEmpty()) },
                        enabled = code.isNotBlank() && !state.isCheckingOut,
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = RajTeal),
                        modifier = Modifier.height(54.dp)
                    ) {
                        Text("Apply", fontWeight = FontWeight.Bold)
                    }
                }
                state.discount?.let { result ->
                    if (!result.valid) {
                        Text(result.message, modifier = Modifier.padding(top = 4.dp), color = Color(0xFFB84A3D), style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            Spacer(Modifier.height(20.dp))
            HorizontalDivider(color = RajTeal.copy(alpha = 0.15f))
            Spacer(Modifier.height(14.dp))

            // ─── Shipping Address & Delivery Validation ─────

            Card(
                colors = CardDefaults.cardColors(containerColor = RajTeal.copy(alpha = 0.08f)),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth(),
                onClick = { viewModel.openPincodeDialog() }
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = RajTeal)
                        Spacer(Modifier.width(8.dp))
                        Column {
                            Text("Delivery PIN: ${state.selectedPincode} (${state.selectedCity})", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                            Text("Tap to check or change delivery PIN code", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                        }
                    }
                    Text("Change", color = RajTeal, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelSmall)
                }
            }
            Spacer(Modifier.height(12.dp))

            Text("Shipping Address", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(4.dp))
            Text("Fresh delivery dispatched from our Birsingpur Pali bakery.", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
            Spacer(Modifier.height(10.dp))

            if (state.currentUser != null) {
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    state.savedAddresses.forEach { addr ->
                        val isSelected = state.selectedAddressId == addr.id
                        FilterChip(
                            selected = isSelected,
                            onClick = { viewModel.selectSavedAddress(addr) },
                            label = { Text(addr.label ?: "Address") },
                            leadingIcon = if (isSelected) {
                                { Icon(Icons.Outlined.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp), tint = RajTeal) }
                            } else null
                        )
                    }
                    OutlinedButton(
                        onClick = { viewModel.openAddressDialog() },
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Icon(Icons.Outlined.Add, contentDescription = null, modifier = Modifier.size(14.dp), tint = RajTeal)
                        Spacer(Modifier.width(4.dp))
                        Text("+ Add Address", style = MaterialTheme.typography.labelSmall, color = RajTeal)
                    }
                }
                Spacer(Modifier.height(8.dp))
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedButton(
                    onClick = {
                        val hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                        val hasCoarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
                        if (hasFine || hasCoarse) {
                            isDetectingLocation = true
                            detectCurrentLocation(context) { address, lat, lon, isEligible ->
                                isDetectingLocation = false
                                if (isEligible && address != null) {
                                    viewModel.setShippingAddress(address)
                                    if (lat != null && lon != null) {
                                        viewModel.setDeliveryCoordinates(lat, lon)
                                    }
                                    locationStatusNotice = Pair("📍 Location detected inside Birsingpur Pali area (PIN: 484551)", true)
                                } else {
                                    locationStatusNotice = Pair("⚠️ Detected location is outside Birsingpur Pali (PIN: 484551). Deliveries are strictly restricted to 484551.", false)
                                }
                            }
                        } else {
                            locationPermissionLauncher.launch(
                                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
                            )
                        }
                    },
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                    modifier = Modifier.height(34.dp)
                ) {
                    if (isDetectingLocation) {
                        CircularProgressIndicator(modifier = Modifier.size(14.dp), color = RajTeal, strokeWidth = 2.dp)
                        Spacer(Modifier.width(6.dp))
                        Text("Detecting GPS...", style = MaterialTheme.typography.labelSmall, color = RajTeal)
                    } else {
                        Icon(Icons.Outlined.MyLocation, contentDescription = null, modifier = Modifier.size(16.dp), tint = RajTeal)
                        Spacer(Modifier.width(6.dp))
                        Text("Detect My Current Location", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = RajTeal)
                    }
                }
            }

            locationStatusNotice?.let { (msg, success) ->
                Spacer(Modifier.height(6.dp))
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (success) Color(0xFF147A46).copy(alpha = 0.08f) else Color(0xFFB84A3D).copy(alpha = 0.08f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        msg,
                        style = MaterialTheme.typography.labelSmall,
                        color = if (success) Color(0xFF147A46) else Color(0xFFB84A3D),
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                    )
                }
            }

            Spacer(Modifier.height(8.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = androidx.compose.foundation.BorderStroke(1.dp, RajTeal.copy(alpha = 0.15f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            "Delivery Address Details",
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleSmall,
                            color = RajTeal
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = RajTeal, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Birsingpur Pali", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = RajTeal)
                        }
                    }

                    Spacer(Modifier.height(10.dp))

                    // Address Tag / Type Chips (Home, Work, Other)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        listOf("Home", "Work", "Other").forEach { tag ->
                            val isSelected = state.addressLabel.equals(tag, ignoreCase = true)
                            FilterChip(
                                selected = isSelected,
                                onClick = { viewModel.setAddressLabel(tag) },
                                label = { Text(tag, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelSmall) },
                                leadingIcon = if (isSelected) {
                                    { Icon(Icons.Outlined.CheckCircle, contentDescription = null, modifier = Modifier.size(14.dp), tint = RajTeal) }
                                } else null
                            )
                        }
                    }

                    Spacer(Modifier.height(10.dp))

                    // House / Flat / Building / Shop No. (Required)
                    OutlinedTextField(
                        value = state.addressHouseNo,
                        onValueChange = { viewModel.setAddressHouseNo(it) },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("House / Flat / Shop / Building No. *") },
                        placeholder = { Text("e.g. Shop No. 14 / House 28, Ward 4") },
                        singleLine = true,
                        enabled = !state.isCheckingOut,
                        shape = RoundedCornerShape(10.dp),
                    )

                    Spacer(Modifier.height(8.dp))

                    // Street / Area / Colony / Ward (Required)
                    OutlinedTextField(
                        value = state.addressStreetArea,
                        onValueChange = { viewModel.setAddressStreetArea(it) },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Street / Colony / Area / Ward *") },
                        placeholder = { Text("e.g. Main Market, Thana Road, Near Bus Stand") },
                        singleLine = true,
                        enabled = !state.isCheckingOut,
                        shape = RoundedCornerShape(10.dp),
                    )

                    Spacer(Modifier.height(8.dp))

                    // Landmark (Optional)
                    OutlinedTextField(
                        value = state.addressLandmark,
                        onValueChange = { viewModel.setAddressLandmark(it) },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Landmark (Optional)") },
                        placeholder = { Text("e.g. Beside Nagar Palika / Opp Civil Hospital") },
                        singleLine = true,
                        enabled = !state.isCheckingOut,
                        shape = RoundedCornerShape(10.dp),
                    )

                    Spacer(Modifier.height(10.dp))

                    // City & State Confirmation with Serviceable PIN Badge
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        color = Color(0xFF147A46).copy(alpha = 0.08f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF147A46).copy(alpha = 0.2f))
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Outlined.CheckCircle, contentDescription = null, tint = Color(0xFF147A46), modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    "${state.selectedCity}, Madhya Pradesh",
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.labelMedium,
                                    color = Color(0xFF147A46)
                                )
                            }
                            Text(
                                "PIN: ${state.selectedPincode}",
                                fontWeight = FontWeight.Black,
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF147A46)
                            )
                        }
                    }

                    // Contact Details if available
                    state.currentUser?.let { u ->
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Receiver: ${u.firstName} ${u.lastName} · ${u.mobileNumber}",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.DarkGray,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            if (state.isValidatingDelivery) {
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = RajTeal, strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                    Text("Verifying address eligibility...", style = MaterialTheme.typography.bodySmall, color = RajTeal)
                }
            }

            state.deliveryValidation?.let { dv ->
                Spacer(Modifier.height(10.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = CardDefaults.cardColors(containerColor = if (dv.allowed) Color(0xFF147A46).copy(alpha = 0.08f) else Color(0xFFB84A3D).copy(alpha = 0.08f)),
                ) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            if (dv.allowed) Icons.Outlined.CheckCircle else Icons.Outlined.LocationOn,
                            contentDescription = null,
                            tint = if (dv.allowed) Color(0xFF147A46) else Color(0xFFB84A3D),
                            modifier = Modifier.size(22.dp),
                        )
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(
                                if (dv.allowed) "Within Delivery Range" else "Out of Delivery Range",
                                fontWeight = FontWeight.Bold,
                                color = if (dv.allowed) Color(0xFF147A46) else Color(0xFFB84A3D),
                                style = MaterialTheme.typography.titleSmall,
                            )
                            Text(
                                "${dv.distanceKm} km · Max radius ${dv.radiusKm} km",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.Gray,
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            if (state.currentUser == null) {
                Card(colors = CardDefaults.cardColors(containerColor = RajSaffron.copy(alpha = 0.15f)), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Please log in or register to checkout", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                        Spacer(Modifier.height(8.dp))
                        Button(onClick = { viewModel.showAuth(true) }, colors = ButtonDefaults.buttonColors(containerColor = RajTeal), modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp)) {
                            Text("Login / Register", fontWeight = FontWeight.Bold)
                        }
                    }
                }
                Spacer(Modifier.height(14.dp))
            }

            Button(
                onClick = { viewModel.startRazorpayCheckout() },
                enabled = !isCheckoutDisabled,
                colors = ButtonDefaults.buttonColors(containerColor = RajTeal),
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp),
            ) {
                if (state.isCheckingOut) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                    Spacer(Modifier.width(10.dp))
                    Text("Securing Payment...", color = Color.White, fontWeight = FontWeight.Bold)
                } else if (isCooldownActive) {
                    val remainingSec = ((state.cooldownRemainingMs + 999) / 1000)
                    Text("Please wait (${remainingSec}s)...", color = Color.White.copy(alpha = 0.8f))
                } else {
                    Icon(Icons.Outlined.CheckCircle, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Pay with Razorpay · ${money(viewModel.finalPayableCents())}", fontWeight = FontWeight.Bold)
                }
            }

            state.checkoutError?.let { err ->
                Spacer(Modifier.height(8.dp))
                Text(err, color = Color(0xFFB84A3D), style = MaterialTheme.typography.bodyMedium)
            }
        }

        // Receipt Modal Dialog
        state.receipt?.let { receipt ->
            AlertDialog(
                onDismissRequest = { viewModel.dismissReceipt() },
                icon = { Icon(Icons.Outlined.CheckCircle, contentDescription = null, tint = Color(0xFF147A46), modifier = Modifier.size(36.dp)) },
                title = { Text("Payment Confirmed!", fontWeight = FontWeight.Bold, color = RajTeal) },
                text = {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text("Thank you for your order. Your transaction was processed securely.", style = MaterialTheme.typography.bodyMedium)
                        Spacer(Modifier.height(14.dp))
                        Card(colors = CardDefaults.cardColors(containerColor = RajCanvas), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text("Order ID: ${receipt.orderId.take(18)}...", style = MaterialTheme.typography.labelSmall)
                                Text("Razorpay Ref: ${receipt.razorpayPaymentId}", style = MaterialTheme.typography.labelSmall)
                                Spacer(Modifier.height(6.dp))
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Amount Paid:", fontWeight = FontWeight.Bold)
                                    Text(money(receipt.amountCents), fontWeight = FontWeight.Bold, color = RajTeal)
                                }
                                Text("Status: ${receipt.status.uppercase()}", color = Color(0xFF147A46), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(onClick = { viewModel.dismissReceipt(); onNavigateToOrders() }, colors = ButtonDefaults.buttonColors(containerColor = RajTeal)) {
                        Text("View in Orders", fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { viewModel.dismissReceipt() }) {
                        Text("Continue Shopping", fontWeight = FontWeight.Bold, color = RajTeal)
                    }
                }
            )
        }
    }
}

// ─── Orders Screen ──────────────────────────────────────────

@Composable
private fun OrdersScreen(state: StorefrontUiState, padding: PaddingValues, viewModel: StorefrontViewModel) {
    Column(modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text("Order History", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text("View past orders, live status & receipts.", color = RajTeal, style = MaterialTheme.typography.bodySmall)
            }
            IconButton(onClick = { viewModel.fetchOrders() }) {
                Icon(Icons.Outlined.CheckCircle, contentDescription = "Refresh", tint = RajTeal)
            }
        }

        if (state.currentUser == null) {
            Spacer(Modifier.height(20.dp))
            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = RajSaffron.copy(alpha = 0.15f)), shape = RoundedCornerShape(12.dp)) {
                Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Log in to view your orders", fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(10.dp))
                    Button(onClick = { viewModel.showAuth(false) }, colors = ButtonDefaults.buttonColors(containerColor = RajTeal), shape = RoundedCornerShape(10.dp)) {
                        Text("Sign In", fontWeight = FontWeight.Bold)
                    }
                }
            }
            return
        }

        Spacer(Modifier.height(14.dp))

        Text("Filter by Status", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(6.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("all" to "All", "paid" to "Paid", "created" to "Pending", "cancelled" to "Cancelled").forEach { (key, label) ->
                FilterChip(selected = state.orderStatusFilter == key, onClick = { viewModel.setOrderStatusFilter(key) }, label = { Text(label, style = MaterialTheme.typography.labelSmall) })
            }
        }

        Spacer(Modifier.height(10.dp))

        Text("Duration Range", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(6.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("7d" to "7 Days", "30d" to "30 Days", "90d" to "3 Months", "1y" to "1 Year", "all" to "All Time").forEach { (key, label) ->
                FilterChip(selected = state.orderDurationFilter == key, onClick = { viewModel.setOrderDurationFilter(key) }, label = { Text(label, style = MaterialTheme.typography.labelSmall) })
            }
        }

        Spacer(Modifier.height(16.dp))

        state.orderNotice?.let { notice ->
            Text(notice, color = RajTeal, modifier = Modifier.padding(bottom = 10.dp), fontWeight = FontWeight.Bold)
        }

        if (state.isLoadingOrders) {
            Column(Modifier.fillMaxWidth().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) { CircularProgressIndicator(color = RajTeal) }
        } else if (state.orders.isEmpty()) {
            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = RajCanvas)) {
                Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("No orders found", fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(4.dp))
                    Text("No orders match your selected filters.", style = MaterialTheme.typography.bodySmall, color = RajTeal)
                }
            }
        } else {
            val context = LocalContext.current
            state.orders.forEach { order ->
                Card(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = RajCanvas)) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Order #${order.id.take(12)}", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                            val (badgeBg, badgeText) = when (order.status) {
                                "delivered" -> Color(0xFF147A46) to "DELIVERED"
                                "out_for_delivery" -> Color(0xFF0284C7) to "OUT FOR DELIVERY"
                                "packed" -> Color(0xFF4F46E5) to "PACKED"
                                "paid" -> Color(0xFF147A46) to "PAID"
                                "created" -> Color(0xFFC08A12) to "PENDING"
                                else -> Color(0xFFB84A3D) to "CANCELLED"
                            }
                            Surface(shape = RoundedCornerShape(6.dp), color = badgeBg.copy(alpha = 0.15f)) {
                                Text(badgeText, color = badgeBg, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                            }
                        }

                        // Delivery Tracking Stepper
                        if (order.status != "cancelled" && order.cancellationStatus != "approved") {
                            Spacer(Modifier.height(10.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                                val steps = listOf(
                                    "Placed" to true,
                                    "Packed" to (order.status in listOf("packed", "out_for_delivery", "delivered")),
                                    "Dispatch" to (order.status in listOf("out_for_delivery", "delivered")),
                                    "Delivered" to (order.status == "delivered")
                                )
                                steps.forEach { (label, done) ->
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Surface(
                                            shape = RoundedCornerShape(12.dp),
                                            color = if (done) RajTeal else Color.LightGray,
                                            modifier = Modifier.size(16.dp)
                                        ) {}
                                        Spacer(Modifier.height(2.dp))
                                        Text(label, style = MaterialTheme.typography.labelSmall, fontSize = 9.sp, color = if (done) RajTeal else Color.Gray, fontWeight = if (done) FontWeight.Bold else FontWeight.Normal)
                                    }
                                }
                            }
                        }

                        // Local Fleet Rider Card
                        if ((order.status == "out_for_delivery" || order.status == "delivered") && !order.riderName.isNullOrBlank()) {
                            Spacer(Modifier.height(10.dp))
                            Surface(shape = RoundedCornerShape(8.dp), color = RajTeal.copy(alpha = 0.08f), modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(10.dp)) {
                                    Text("Local Fleet Rider: ${order.riderName}", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                                    order.dispatchSlot?.let { Text("Slot: $it", style = MaterialTheme.typography.labelSmall, color = Color.Gray) }
                                    Spacer(Modifier.height(6.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        if (!order.riderPhone.isNullOrBlank()) {
                                            OutlinedButton(
                                                onClick = {
                                                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${order.riderPhone}"))
                                                    context.startActivity(intent)
                                                },
                                                modifier = Modifier.height(32.dp),
                                                contentPadding = PaddingValues(horizontal = 8.dp)
                                            ) {
                                                Text("Call Rider", style = MaterialTheme.typography.labelSmall)
                                            }
                                        }
                                        if (!order.trackingUrl.isNullOrBlank()) {
                                            OutlinedButton(
                                                onClick = {
                                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(order.trackingUrl))
                                                    context.startActivity(intent)
                                                },
                                                modifier = Modifier.height(32.dp),
                                                contentPadding = PaddingValues(horizontal = 8.dp)
                                            ) {
                                                Text("Live Route", style = MaterialTheme.typography.labelSmall)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Cancellation Status Alert Badge
                        if (order.cancellationStatus == "requested") {
                            Spacer(Modifier.height(8.dp))
                            Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFFFF3CD), modifier = Modifier.fillMaxWidth()) {
                                Text("⚠️ Cancellation requested · Awaiting staff approval", color = Color(0xFF856404), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, modifier = Modifier.padding(8.dp))
                            }
                        } else if (order.cancellationStatus == "approved") {
                            Spacer(Modifier.height(8.dp))
                            Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFFFEAEA), modifier = Modifier.fillMaxWidth()) {
                                Text("Order cancelled & refund issued", color = Color(0xFFB84A3D), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, modifier = Modifier.padding(8.dp))
                            }
                        }

                        Spacer(Modifier.height(6.dp))
                        order.shippingAddress?.let {
                            Text("Ship to: $it", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                        }

                        Spacer(Modifier.height(8.dp))
                        HorizontalDivider(color = RajTeal.copy(alpha = 0.15f))
                        Spacer(Modifier.height(8.dp))

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Total Paid (MRP Incl.):", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                            Text(money(order.totalCents), fontWeight = FontWeight.Bold, color = RajTeal, style = MaterialTheme.typography.titleMedium)
                        }

                        Spacer(Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            // Invoice Download Button
                            OutlinedButton(
                                onClick = {
                                    val invoiceUrl = "${com.rajtraders.shop.data.NetworkModule.resolvedBaseUrl}v1/checkout/orders/${order.id}/invoice"
                                    runCatching {
                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(invoiceUrl))
                                        context.startActivity(intent)
                                    }
                                },
                                modifier = Modifier.weight(1f).height(36.dp),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 4.dp)
                            ) {
                                Text("Tax Invoice PDF", style = MaterialTheme.typography.labelSmall)
                            }

                            // Cancellation Request Button
                            if ((order.status == "paid" || order.status == "packed") && order.cancellationStatus.isNullOrBlank()) {
                                OutlinedButton(
                                    onClick = {
                                        viewModel.requestOrderCancellation(order.id, "Customer requested cancellation via Android app")
                                    },
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFB84A3D)),
                                    modifier = Modifier.weight(1f).height(36.dp),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 4.dp)
                                ) {
                                    Text("Cancel Order", style = MaterialTheme.typography.labelSmall)
                                }
                            }
                        }

                        if (order.status == "created") {
                            Spacer(Modifier.height(8.dp))
                            Button(
                                onClick = { viewModel.cancelPendingOrder(order.id) },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFB84A3D)),
                                modifier = Modifier.fillMaxWidth().height(38.dp),
                                shape = RoundedCornerShape(8.dp),
                            ) {
                                Text("Cancel Pending Order", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ErrorState(message: String, retry: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text(message, color = Color(0xFFB84A3D))
        Spacer(Modifier.height(12.dp))
        Button(onClick = retry) { Text("Try again") }
    }
}

private fun money(cents: Int, currencyCode: String = "INR"): String {
    return try {
        if (currencyCode.equals("INR", ignoreCase = true)) {
            "₹" + String.format(Locale.getDefault(), "%,d", cents / 100)
        } else {
            val format = NumberFormat.getCurrencyInstance(Locale.getDefault())
            format.currency = Currency.getInstance(currencyCode)
            format.format(cents / 100.0)
        }
    } catch (_: Exception) {
        "₹${cents / 100}"
    }
}

// ─── Customer Notifications Dialog ──────────────────────────

@Composable
private fun NotificationsDialog(state: StorefrontUiState, viewModel: StorefrontViewModel) {
    AlertDialog(
        onDismissRequest = { viewModel.dismissNotificationsDialog() },
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Notifications", fontWeight = FontWeight.Bold, color = RajTeal)
                if (state.unreadNotificationsCount > 0) {
                    TextButton(onClick = { viewModel.markAllNotificationsRead() }) {
                        Text("Mark all read", style = MaterialTheme.typography.labelSmall, color = RajTeal)
                    }
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                if (state.notifications.isEmpty()) {
                    Box(modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp), contentAlignment = Alignment.Center) {
                        Text("No notifications yet", color = Color.Gray, style = MaterialTheme.typography.bodyMedium)
                    }
                } else {
                    state.notifications.forEach { item ->
                        Surface(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            shape = RoundedCornerShape(8.dp),
                            color = if (!item.isRead) RajSaffron.copy(alpha = 0.15f) else RajCanvas
                        ) {
                            Column(Modifier.padding(10.dp)) {
                                Text(item.title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                                Spacer(Modifier.height(2.dp))
                                Text(item.message, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = { viewModel.dismissNotificationsDialog() }, colors = ButtonDefaults.buttonColors(containerColor = RajTeal)) {
                Text("Close")
            }
        }
    )
}

// ─── Customer Address CRUD Dialog ───────────────────────────

@Composable
private fun AddressDialog(state: StorefrontUiState, viewModel: StorefrontViewModel) {
    val editing = state.editingAddress
    var label by remember { mutableStateOf(editing?.label ?: "Home") }
    var houseNumber by remember { mutableStateOf(editing?.houseNumber ?: "") }
    var landmark by remember { mutableStateOf(editing?.landmark ?: "") }
    var fullAddress by remember { mutableStateOf(editing?.fullAddress ?: "") }
    var city by remember { mutableStateOf(editing?.city ?: state.selectedCity) }
    var pincode by remember { mutableStateOf(editing?.pincode ?: state.selectedPincode) }
    var stateName by remember { mutableStateOf(editing?.state ?: "Madhya Pradesh") }
    var isDefault by remember { mutableStateOf(editing?.isDefault ?: false) }

    AlertDialog(
        onDismissRequest = { viewModel.dismissAddressDialog() },
        title = {
            Text(if (editing != null) "Edit Address" else "Add New Address", fontWeight = FontWeight.Bold, color = RajTeal)
        },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Home", "Office", "Other").forEach { tag ->
                        FilterChip(
                            selected = label == tag,
                            onClick = { label = tag },
                            label = { Text(tag) }
                        )
                    }
                }
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = houseNumber, onValueChange = { houseNumber = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Flat / House No. / Building") }, singleLine = true)
                Spacer(Modifier.height(6.dp))
                OutlinedTextField(value = fullAddress, onValueChange = { fullAddress = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Street Address / Colony *") }, minLines = 2)
                Spacer(Modifier.height(6.dp))
                OutlinedTextField(value = landmark, onValueChange = { landmark = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Landmark (Optional)") }, singleLine = true)
                Spacer(Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = city, onValueChange = { city = it }, modifier = Modifier.weight(1f), label = { Text("City *") }, singleLine = true)
                    OutlinedTextField(value = pincode, onValueChange = { if (it.length <= 6) pincode = it }, modifier = Modifier.weight(1f), label = { Text("Pincode *") }, singleLine = true)
                }

                state.addressError?.let { err ->
                    Spacer(Modifier.height(6.dp))
                    Text(err, color = Color(0xFFB84A3D), style = MaterialTheme.typography.bodySmall)
                }

                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Switch(checked = isDefault, onCheckedChange = { isDefault = it }, colors = SwitchDefaults.colors(checkedThumbColor = RajTeal, checkedTrackColor = RajTeal.copy(alpha = 0.5f)))
                    Spacer(Modifier.width(8.dp))
                    Text("Set as default delivery address", style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    viewModel.saveAddress(
                        label = label,
                        fullAddress = fullAddress,
                        houseNumber = houseNumber,
                        landmark = landmark,
                        pincode = pincode,
                        city = city,
                        state = stateName,
                        isDefault = isDefault
                    )
                },
                colors = ButtonDefaults.buttonColors(containerColor = RajTeal),
                enabled = fullAddress.isNotBlank() && pincode.isNotBlank() && city.isNotBlank()
            ) {
                Text("Save Address")
            }
        },
        dismissButton = {
            TextButton(onClick = { viewModel.dismissAddressDialog() }) {
                Text("Cancel", color = RajTeal)
            }
        }
    )
}

// ─── In-App Google Play Policy Legal Dialog ─────────────────

@Composable
private fun LegalDialog(state: StorefrontUiState, viewModel: StorefrontViewModel) {
    val context = LocalContext.current
    val title = state.activeLegalTitle ?: "Legal Policy"
    val isRefund = title.contains("Refund", ignoreCase = true) || title.contains("Cancellation", ignoreCase = true)
    val isPrivacy = title.contains("Privacy", ignoreCase = true)

    AlertDialog(
        onDismissRequest = { viewModel.dismissLegalDialog() },
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    when {
                        isRefund -> Icons.Outlined.CheckCircle
                        isPrivacy -> Icons.Outlined.Security
                        else -> Icons.Outlined.Policy
                    },
                    contentDescription = null,
                    tint = RajTeal,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(title, fontWeight = FontWeight.Bold, color = RajTeal)
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                when {
                    isRefund -> {
                        Text(
                            "Raj Traders Refund & Cancellation Policy",
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleSmall,
                            color = RajTeal
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            "• Pre-Dispatch Cancellation: 100% immediate refund if cancelled before order packing and dispatch from our Birsingpur Pali bakery.\n\n" +
                            "• Food Safety Regulations: Under FSSAI and Indian food hygiene standards, delivered artisanal bakes cannot be returned once handed over.\n\n" +
                            "• Damaged or Incorrect Orders: If an order arrives damaged or defective, notify us within 24 hours for a prompt replacement or 100% refund.\n\n" +
                            "• Refund Settlement: Razorpay online payments are credited back to the original bank/UPI account within 3–5 business days.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.DarkGray
                        )
                    }
                    isPrivacy -> {
                        Text(
                            "Customer Privacy Protection & Data Rights",
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleSmall,
                            color = RajTeal
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            "• Data Handled: Customer name, phone number, and delivery address are collected exclusively to fulfill orders and send delivery notifications.\n\n" +
                            "• Zero Data Reselling: Raj Traders does not sell, rent, or monetize customer data to third-party advertisers.\n\n" +
                            "• Payment Security: Payment details are securely tokenized via PCI-DSS certified Razorpay. No card numbers or UPI PINs are stored on our servers.\n\n" +
                            "• Right to Deletion: You can delete your account and personal history anytime via the 'Delete Account' button in your Account tab.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.DarkGray
                        )
                    }
                    else -> {
                        Text(
                            "Terms of Service & Order Fulfillment",
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleSmall,
                            color = RajTeal
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            "• Registered Entity: ${state.shopName} (GSTIN: 23AAAAA0000A1Z5), Thana Rd, beside Nagar Palika, Pali Birsinghpur, MP 484551.\n\n" +
                            "• Service Area: Fresh bakery goods and store supplies are delivered within Pali Birsinghpur (PIN: 484551).\n\n" +
                            "• Order Acceptance: Orders are fulfilled according to daily batch availability.\n\n" +
                            "• Customer Support: Official assistance available at ${viewModel.getSupportEmail()} or via WhatsApp during store hours (7:00 AM – 10:00 PM).",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.DarkGray
                        )
                    }
                }
                Spacer(Modifier.height(10.dp))
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = RajTeal.copy(alpha = 0.08f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        "Official canonical URL: ${state.activeLegalUrl ?: viewModel.getCanonicalLegalUrl("refund")}",
                        style = MaterialTheme.typography.labelSmall,
                        color = RajTeal,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(8.dp)
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    state.activeLegalUrl?.let { url ->
                        runCatching {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                            context.startActivity(intent)
                        }
                    }
                    viewModel.dismissLegalDialog()
                },
                colors = ButtonDefaults.buttonColors(containerColor = RajTeal)
            ) {
                Text("Open Web Page")
            }
        },
        dismissButton = {
            TextButton(onClick = { viewModel.dismissLegalDialog() }) {
                Text("Close", color = RajTeal)
            }
        }
    )
}

// ─── Available Coupons & Refund Credits Dialog ──────────────

@Composable
private fun CouponsDialog(
    state: StorefrontUiState,
    viewModel: StorefrontViewModel,
    onApplyCoupon: (String) -> Unit
) {
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = { viewModel.closeCouponsDialog() },
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.CheckCircle, contentDescription = null, tint = RajTeal, modifier = Modifier.size(22.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Available Coupons", fontWeight = FontWeight.Bold, color = RajTeal)
                }
                IconButton(onClick = { viewModel.fetchCoupons() }) {
                    Icon(Icons.Outlined.CheckCircle, contentDescription = "Refresh", tint = RajTeal, modifier = Modifier.size(18.dp))
                }
            }
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
                if (state.isLoadingCoupons) {
                    Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = RajTeal)
                    }
                } else if (state.availableCoupons.isEmpty()) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = RajCanvas,
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("No Coupons Available", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "There are no active public promotions or refund credits linked to your account right now.",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.Gray,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        state.availableCoupons.forEach { coupon ->
                            val isRefund = coupon.isRefundCredit || coupon.code.startsWith("CREDIT-") || coupon.code.startsWith("REFUND-")
                            val badgeBg = if (isRefund) Color(0xFFD97706) else RajTeal
                            val offerText = if (coupon.type == "percentage") {
                                "${coupon.value.toInt()}% OFF"
                            } else {
                                if (coupon.value >= 100.0) money(coupon.value.toInt()) + " OFF" else "₹${coupon.value.toInt()} OFF"
                            }

                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                color = if (isRefund) Color(0xFFFFFBEB) else RajCanvas,
                                shape = RoundedCornerShape(10.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, if (isRefund) Color(0xFFFDE68A) else Color.Transparent)
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Surface(
                                            shape = RoundedCornerShape(4.dp),
                                            color = badgeBg.copy(alpha = 0.15f)
                                        ) {
                                            Text(
                                                if (isRefund) "REFUND CREDIT" else "PROMO",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = badgeBg,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                        Text(
                                            offerText,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = if (isRefund) Color(0xFFB45309) else RajTeal,
                                            style = MaterialTheme.typography.titleSmall
                                        )
                                    }

                                    Spacer(Modifier.height(6.dp))
                                    Text(
                                        coupon.code,
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                                        color = if (isRefund) Color(0xFF92400E) else RajTeal
                                    )

                                    val minSpendText = if (coupon.minimumSubtotalCents > 0) "Min spend ₹${coupon.minimumSubtotalCents / 100}" else "No min spend"
                                    val firstOrderText = if (coupon.firstOrderOnly) " · 1st Order Only" else ""
                                    val expiryText = coupon.expiresAt?.take(10)?.let { " · Exp: $it" } ?: ""
                                    Text(
                                        "$minSpendText$firstOrderText$expiryText",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color.DarkGray
                                    )

                                    Spacer(Modifier.height(8.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        OutlinedButton(
                                            onClick = {
                                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
                                                if (clipboard != null) {
                                                    val clip = android.content.ClipData.newPlainText("Coupon Code", coupon.code)
                                                    clipboard.setPrimaryClip(clip)
                                                    android.widget.Toast.makeText(context, "Code ${coupon.code} copied!", android.widget.Toast.LENGTH_SHORT).show()
                                                }
                                            },
                                            shape = RoundedCornerShape(8.dp),
                                            modifier = Modifier.weight(1f).height(34.dp),
                                            contentPadding = PaddingValues(horizontal = 4.dp)
                                        ) {
                                            Text("Copy", style = MaterialTheme.typography.labelSmall)
                                        }

                                        Button(
                                            onClick = { onApplyCoupon(coupon.code) },
                                            colors = ButtonDefaults.buttonColors(containerColor = if (isRefund) Color(0xFFD97706) else RajTeal),
                                            shape = RoundedCornerShape(8.dp),
                                            modifier = Modifier.weight(1f).height(34.dp),
                                            contentPadding = PaddingValues(horizontal = 4.dp)
                                        ) {
                                            Text("1-Tap Apply", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { viewModel.closeCouponsDialog() },
                colors = ButtonDefaults.buttonColors(containerColor = RajTeal)
            ) {
                Text("Close")
            }
        }
    )
}