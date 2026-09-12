package com.rajtraders.shop

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
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
import coil.compose.AsyncImage
import com.rajtraders.shop.data.Product
import java.text.NumberFormat
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
            TopAppBar(
                title = {
                    Column {
                        Text(state.shopName, fontWeight = FontWeight.Bold)
                        Text(
                            if (state.currentUser != null) "Welcome, ${state.currentUser!!.firstName}!" else "gourmet bakery & artisanal cakes",
                            style = MaterialTheme.typography.labelSmall,
                        )
                    }
                },
                actions = {
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
        },
        bottomBar = {
            NavigationBar(containerColor = Color.White) {
                NavigationBarItem(selected = selectedTab == 0, onClick = { selectedTab = 0 }, icon = { Icon(Icons.Outlined.Verified, null) }, label = { Text("Shop") })
                NavigationBarItem(selected = selectedTab == 1, onClick = { selectedTab = 1 }, icon = { Icon(Icons.Outlined.ShoppingBag, null) }, label = { Text("Bag") })
                NavigationBarItem(selected = selectedTab == 2, onClick = { selectedTab = 2; viewModel.fetchOrders() }, icon = { Icon(Icons.Outlined.CheckCircle, null) }, label = { Text("Orders") })
                NavigationBarItem(selected = selectedTab == 3, onClick = { selectedTab = 3 }, icon = { Icon(Icons.Outlined.Person, null) }, label = { Text("Account") })
            }
        },
    ) { padding ->
        when (selectedTab) {
            0 -> CatalogScreen(state, padding, viewModel)
            1 -> CartScreen(state, padding, viewModel, onNavigateToOrders = { selectedTab = 2; viewModel.fetchOrders() })
            2 -> OrdersScreen(state, padding, viewModel)
            else -> AccountScreen(state, padding, viewModel)
        }
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
}

// ─── Native Share Helper ────────────────────────────────────

private fun shareProductUrl(context: Context, product: Product, shopName: String = "RAJ TRADERS") {
    val shareUrl = "https://sundarvan.xyz/products/${product.slug}"
    val sendIntent: Intent = Intent().apply {
        action = Intent.ACTION_SEND
        putExtra(Intent.EXTRA_TEXT, "Check out ${product.name} at $shopName! Prep time: ${product.prepTimeMinutes} mins.\n$shareUrl")
        type = "text/plain"
    }
    val shareIntent = Intent.createChooser(sendIntent, "Share ${product.name}")
    context.startActivity(shareIntent)
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
    var showDeleteConfirmDialog by remember { mutableStateOf(false) }

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
            val user = state.currentUser!!
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
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = state.selectedCategory == null, onClick = { viewModel.selectCategory(null) }, label = { Text("All") })
                state.summary?.categories?.take(3)?.forEach { category ->
                    FilterChip(selected = state.selectedCategory == category, onClick = { viewModel.selectCategory(category) }, label = { Text(category) })
                }
            }
            Spacer(Modifier.height(12.dp))
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
                        onShare = { shareProductUrl(context, product, state.shopName) }
                    )
                }
            }
        }
    }
}

@Composable
private fun ProductCard(product: Product, onAdd: () -> Unit, onShare: () -> Unit) {
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
                Text(product.category.uppercase(), style = MaterialTheme.typography.labelSmall, color = RajTeal)
                Text(product.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(money(product.priceCents), style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Button(onClick = onAdd, modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(vertical = 2.dp)) { Text("Add") }
            }
        }
    }
}

// ─── Cart / Checkout Screen ─────────────────────────────────

@Composable
private fun CartScreen(state: StorefrontUiState, padding: PaddingValues, viewModel: StorefrontViewModel, onNavigateToOrders: () -> Unit) {
    var code by remember { mutableStateOf("") }
    val isCooldownActive = state.cooldownRemainingMs > 0L
    val isCheckoutDisabled = state.isCheckingOut || isCooldownActive || state.cart.isEmpty()

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
            Spacer(Modifier.height(12.dp))
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

            Spacer(Modifier.height(20.dp))
            OutlinedTextField(value = code, onValueChange = { code = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Discount code") }, singleLine = true, enabled = !state.isCheckingOut)
            Spacer(Modifier.height(8.dp))
            Button(onClick = { viewModel.validateDiscount(code, state.claim?.claimed == true) }, enabled = code.isNotBlank() && !state.isCheckingOut, modifier = Modifier.fillMaxWidth()) { Text("Apply code") }
            state.discount?.let { result ->
                Text(if (result.valid) "${result.message}  −${money(result.discountCents)}" else result.message, modifier = Modifier.padding(top = 8.dp), color = if (result.valid) RajTeal else Color(0xFFB84A3D))
            }

            Spacer(Modifier.height(20.dp))
            HorizontalDivider(color = RajTeal.copy(alpha = 0.15f))
            Spacer(Modifier.height(14.dp))

            // ─── Shipping Address & Delivery Validation ─────

            Text("Shipping Address", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            Text("Required before payment. Enter delivery address & coordinates.", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
            Spacer(Modifier.height(10.dp))

            OutlinedTextField(
                value = state.shippingAddress,
                onValueChange = { viewModel.setShippingAddress(it) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Street, City, Postal Code") },
                singleLine = false,
                minLines = 2,
                enabled = !state.isCheckingOut,
            )

            Spacer(Modifier.height(10.dp))

            var latText by remember { mutableStateOf("") }
            var lonText by remember { mutableStateOf("") }

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = latText,
                    onValueChange = { latText = it },
                    modifier = Modifier.weight(1f),
                    label = { Text("Latitude") },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = lonText,
                    onValueChange = { lonText = it },
                    modifier = Modifier.weight(1f),
                    label = { Text("Longitude") },
                    singleLine = true,
                )
            }
            Spacer(Modifier.height(8.dp))
            Button(
                onClick = {
                    val lat = latText.toDoubleOrNull()
                    val lon = lonText.toDoubleOrNull()
                    if (lat != null && lon != null) {
                        viewModel.setDeliveryCoordinates(lat, lon)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = latText.toDoubleOrNull() != null && lonText.toDoubleOrNull() != null,
            ) {
                Icon(Icons.Outlined.LocationOn, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Validate Delivery Location")
            }

            if (state.isValidatingDelivery) {
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = RajTeal, strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                    Text("Checking delivery range...", style = MaterialTheme.typography.bodySmall, color = RajTeal)
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
            state.orders.forEach { order ->
                Card(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = RajCanvas)) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Order #${order.id.take(12)}", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                            val (badgeBg, badgeText) = when (order.status) {
                                "paid" -> Color(0xFF147A46) to "PAID"
                                "created" -> Color(0xFFC08A12) to "PENDING"
                                else -> Color(0xFFB84A3D) to "CANCELLED"
                            }
                            Surface(shape = RoundedCornerShape(6.dp), color = badgeBg.copy(alpha = 0.15f)) {
                                Text(badgeText, color = badgeBg, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                            }
                        }

                        Spacer(Modifier.height(6.dp))
                        order.razorpayPaymentId?.let {
                            Text("Razorpay Ref: $it", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                        }
                        order.shippingAddress?.let {
                            Text("Ship to: $it", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                        }

                        Spacer(Modifier.height(8.dp))
                        HorizontalDivider(color = RajTeal.copy(alpha = 0.15f))
                        Spacer(Modifier.height(8.dp))

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Total Amount Paid:", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                            Text(money(order.totalCents), fontWeight = FontWeight.Bold, color = RajTeal, style = MaterialTheme.typography.titleMedium)
                        }

                        if (order.status == "created") {
                            Spacer(Modifier.height(10.dp))
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

private fun money(cents: Int): String =
    NumberFormat.getCurrencyInstance(Locale.US).format(cents / 100.0)