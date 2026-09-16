package com.rajtraders.shop

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rajtraders.shop.data.DeliveryValidationResponse
import com.rajtraders.shop.data.DiscountValidation
import com.rajtraders.shop.data.OrderHistoryItem
import com.rajtraders.shop.data.OrderItemRequest
import com.rajtraders.shop.data.OrderReceipt
import com.rajtraders.shop.data.Product
import com.rajtraders.shop.data.RegistrationClaim
import com.rajtraders.shop.data.RegistrationEligibility
import com.rajtraders.shop.data.ShopInfoResponse
import com.rajtraders.shop.data.StorefrontRepository
import com.rajtraders.shop.data.StorefrontSummary
import com.rajtraders.shop.data.UserProfile
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

data class CartLine(val product: Product, val quantity: Int)

data class StorefrontUiState(
    val isLoading: Boolean = true,
    val products: List<Product> = emptyList(),
    val summary: StorefrontSummary? = null,
    val shopName: String = "RAJ TRADERS",
    val cart: List<CartLine> = emptyList(),
    val search: String = "",
    val selectedCategory: String? = null,
    val eligibility: RegistrationEligibility? = null,
    val claim: RegistrationClaim? = null,
    val discount: DiscountValidation? = null,
    val error: String? = null,
    // 1-Payment Security & Debounce States
    val isCheckingOut: Boolean = false,
    val cooldownRemainingMs: Long = 0L,
    val receipt: OrderReceipt? = null,
    val checkoutError: String? = null,
    // Order History States
    val orders: List<OrderHistoryItem> = emptyList(),
    val orderStatusFilter: String = "all",
    val orderDurationFilter: String = "1y",
    val isLoadingOrders: Boolean = false,
    val orderNotice: String? = null,
    // Auth States
    val authToken: String? = null,
    val currentUser: UserProfile? = null,
    val isAuthenticating: Boolean = false,
    val authError: String? = null,
    val authSuccess: String? = null,
    val showAuthScreen: Boolean = false,
    val isRegistering: Boolean = true,
    val showForgotPasswordDialog: Boolean = false,
    val forgotPasswordSuccess: String? = null,
    val forgotPasswordError: String? = null,
    val isSendingRecoveryEmail: Boolean = false,
    val showResetPasswordDialog: Boolean = false,
    val resetPasswordSuccess: String? = null,
    val resetPasswordError: String? = null,
    val isResettingPassword: Boolean = false,
    // 2FA / Login Email Verification States (Nodemailer OTP)
    val showOtpVerificationDialog: Boolean = false,
    val pendingLoginEmail: String = "",
    val isVerifyingOtp: Boolean = false,
    val isResendingOtp: Boolean = false,
    val otpError: String? = null,
    val otpNotice: String? = null,
    // Account Deletion & 15-Day Penalty States
    val isDeletingAccount: Boolean = false,
    val accountDeletionNotice: String? = null,
    val lockdownWarning: String? = null,
    // Shipping & Delivery States
    val shippingAddress: String = "",
    val deliveryLatitude: Double? = null,
    val deliveryLongitude: Double? = null,
    val deliveryValidation: DeliveryValidationResponse? = null,
    val isValidatingDelivery: Boolean = false,
    val shopInfo: ShopInfoResponse? = null,
    // Profile Edit
    val isUpdatingProfile: Boolean = false,
    val profileUpdateMessage: String? = null,
    // TOTP (2FA Authenticator App) States
    val showTotpChallengeDialog: Boolean = false,
    val pendingTotpEmail: String = "",
    val showTotpSetupDialog: Boolean = false,
    val isSettingUpTotp: Boolean = false,
    val totpSecret: String? = null,
    val totpQrUrl: String? = null,
    val totpManualKey: String? = null,
    val totpRecoveryCodes: List<String> = emptyList(),
    val totpError: String? = null,
    val totpNotice: String? = null,
    // PIN Code Delivery & Location States
    val selectedPincode: String = "482004",
    val selectedCity: String = "Jabalpur",
    val showPincodeDialog: Boolean = false,
    val pincodeCheckResult: com.rajtraders.shop.data.PincodeCheckResponse? = null,
    val isCheckingPincode: Boolean = false,
    val pincodeError: String? = null,
    val isPincodeFilterActive: Boolean = false,
)

class StorefrontViewModel(private val repository: StorefrontRepository) : ViewModel() {
    private val _uiState = MutableStateFlow(StorefrontUiState())
    val uiState: StateFlow<StorefrontUiState> = _uiState.asStateFlow()

    private var activeIdempotencyKey: String = UUID.randomUUID().toString()
    private var lastCheckoutClickTime: Long = 0L
    private val checkoutCooldownWindowMs: Long = 2500L

    init {
        refresh()
        fetchShopInfo()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            runCatching {
                repository.products(_uiState.value.search, _uiState.value.selectedCategory) to repository.summary()
            }.onSuccess { (products, summary) ->
                _uiState.update { it.copy(isLoading = false, products = products, summary = summary, shopName = summary.shopName) }
            }.onFailure { error ->
                _uiState.update { it.copy(isLoading = false, error = error.message ?: "Could not load the shop.") }
            }
        }
    }

    fun search(value: String) {
        _uiState.update { it.copy(search = value) }
        refresh()
    }

    fun selectCategory(value: String?) {
        _uiState.update { it.copy(selectedCategory = value) }
        refresh()
    }

    fun addToCart(product: Product) {
        _uiState.update { state ->
            val existing = state.cart.firstOrNull { it.product.id == product.id }
            val next = if (existing == null) {
                state.cart + CartLine(product, 1)
            } else {
                state.cart.map { line ->
                    if (line.product.id == product.id) line.copy(quantity = line.quantity + 1) else line
                }
            }
            state.copy(cart = next)
        }
    }

    fun removeFromCart(productId: String) {
        _uiState.update { state ->
            state.copy(cart = state.cart.mapNotNull { line ->
                if (line.product.id != productId) line
                else if (line.quantity == 1) null else line.copy(quantity = line.quantity - 1)
            })
        }
    }

    fun checkEligibility(email: String) {
        viewModelScope.launch {
            runCatching { repository.eligibility(email) }
                .onSuccess { result -> _uiState.update { it.copy(eligibility = result, error = null) } }
                .onFailure { error -> _uiState.update { it.copy(error = error.message ?: "Could not check this email.") } }
        }
    }

    fun claimOffer(email: String) {
        viewModelScope.launch {
            runCatching { repository.claim(email) }
                .onSuccess { result -> _uiState.update { it.copy(claim = result, eligibility = null, error = null) } }
                .onFailure { error -> _uiState.update { it.copy(error = error.message ?: "Could not claim the offer.") } }
        }
    }

    fun validateDiscount(code: String, firstOrder: Boolean) {
        viewModelScope.launch {
            runCatching { repository.discount(code, cartTotalCents(), firstOrder) }
                .onSuccess { result -> _uiState.update { it.copy(discount = result, error = null) } }
                .onFailure { error -> _uiState.update { it.copy(error = error.message ?: "Could not validate this code.") } }
        }
    }

    fun cartTotalCents() = _uiState.value.cart.sumOf { it.product.priceCents * it.quantity }

    fun finalPayableCents(): Int {
        val subtotal = cartTotalCents()
        val discount = _uiState.value.discount?.let { if (it.valid) it.discountCents else 0 } ?: 0
        return maxOf(100, subtotal - discount)
    }

    // ─── Auth & Security Methods ────────────────────────────

    fun showAuth(isRegister: Boolean = true) {
        _uiState.update { it.copy(showAuthScreen = true, isRegistering = isRegister, authError = null, authSuccess = null) }
    }

    fun hideAuth() {
        _uiState.update { it.copy(showAuthScreen = false, authError = null, authSuccess = null) }
    }

    fun toggleAuthMode() {
        _uiState.update { it.copy(isRegistering = !it.isRegistering, authError = null) }
    }

    fun register(firstName: String, lastName: String, mobile: String, email: String, password: String, confirmPassword: String) {
        if (password != confirmPassword) {
            _uiState.update { it.copy(authError = "Passwords do not match.") }
            return
        }
        val cleanEmail = email.trim().lowercase()
        viewModelScope.launch {
            _uiState.update { it.copy(isAuthenticating = true, authError = null) }
            runCatching {
                repository.register(firstName, lastName, mobile, cleanEmail, password, confirmPassword)
            }.onSuccess { response ->
                if (response.requiresVerification == true) {
                    _uiState.update {
                        it.copy(
                            isAuthenticating = false,
                            showAuthScreen = false,
                            showOtpVerificationDialog = true,
                            pendingLoginEmail = response.email ?: cleanEmail,
                            otpNotice = response.message ?: "A 6-digit verification code has been sent to your email.",
                            otpError = null,
                            lockdownWarning = response.lockdownPenaltyNotice,
                        )
                    }
                } else if (response.token != null && response.user != null) {
                    _uiState.update {
                        it.copy(
                            isAuthenticating = false,
                            authToken = response.token,
                            currentUser = response.user,
                            showAuthScreen = false,
                            authSuccess = "Welcome, ${response.user.firstName}!",
                            lockdownWarning = response.lockdownPenaltyNotice,
                        )
                    }
                    fetchOrders()
                } else {
                    _uiState.update { it.copy(isAuthenticating = false, authError = "Registration failed.") }
                }
            }.onFailure { err ->
                _uiState.update { it.copy(isAuthenticating = false, authError = err.message ?: "Registration failed.") }
            }
        }
    }

    fun login(email: String, password: String) {
        val cleanEmail = email.trim().lowercase()
        viewModelScope.launch {
            _uiState.update { it.copy(isAuthenticating = true, authError = null) }
            runCatching {
                repository.login(cleanEmail, password)
            }.onSuccess { response ->
                if (response.requiresTotpVerification == true) {
                    _uiState.update {
                        it.copy(
                            isAuthenticating = false,
                            showAuthScreen = false,
                            showTotpChallengeDialog = true,
                            pendingTotpEmail = cleanEmail,
                            totpError = null,
                            totpNotice = response.message ?: "Please enter 6-digit 2FA code from your authenticator app.",
                        )
                    }
                } else if (response.requiresVerification == true) {
                    _uiState.update {
                        it.copy(
                            isAuthenticating = false,
                            showAuthScreen = false,
                            showOtpVerificationDialog = true,
                            pendingLoginEmail = cleanEmail,
                            otpNotice = response.message ?: "A 6-digit verification code has been sent to your email.",
                            otpError = null,
                        )
                    }
                } else if (response.token != null && response.user != null) {
                    _uiState.update {
                        it.copy(
                            isAuthenticating = false,
                            authToken = response.token,
                            currentUser = response.user,
                            showAuthScreen = false,
                            showOtpVerificationDialog = false,
                            authSuccess = "Welcome back, ${response.user.firstName}!",
                        )
                    }
                    fetchOrders()
                } else {
                    _uiState.update { it.copy(isAuthenticating = false, authError = "Authentication failed.") }
                }
            }.onFailure { err ->
                _uiState.update { it.copy(isAuthenticating = false, authError = err.message ?: "Login failed.") }
            }
        }
    }

    fun verifyLoginOtp(otpCode: String) {
        val email = _uiState.value.pendingLoginEmail
        if (email.isBlank() || otpCode.length < 6) {
            _uiState.update { it.copy(otpError = "Please enter the complete 6-digit verification code.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isVerifyingOtp = true, otpError = null) }
            runCatching {
                repository.verifyLoginOtp(email, otpCode)
            }.onSuccess { response ->
                _uiState.update {
                    it.copy(
                        isVerifyingOtp = false,
                        authToken = response.token,
                        currentUser = response.user,
                        showOtpVerificationDialog = false,
                        authSuccess = "Welcome, ${response.user.firstName}!",
                        pendingLoginEmail = "",
                    )
                }
                fetchOrders()
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isVerifyingOtp = false,
                        otpError = err.message ?: "Verification failed. Please check your code.",
                    )
                }
            }
        }
    }

    fun resendLoginOtp() {
        val email = _uiState.value.pendingLoginEmail
        if (email.isBlank()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isResendingOtp = true, otpError = null) }
            runCatching {
                repository.resendLoginOtp(email)
            }.onSuccess { response ->
                _uiState.update {
                    it.copy(
                        isResendingOtp = false,
                        otpNotice = response.message,
                    )
                }
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isResendingOtp = false,
                        otpError = err.message ?: "Failed to resend code.",
                    )
                }
            }
        }
    }

    fun hideOtpVerification() {
        _uiState.update { it.copy(showOtpVerificationDialog = false, otpError = null, otpNotice = null) }
    }

    fun logout() {
        _uiState.update {
            it.copy(
                authToken = null,
                currentUser = null,
                orders = emptyList(),
                authSuccess = null,
                lockdownWarning = null,
            )
        }
    }

    fun updateProfile(firstName: String?, lastName: String?, mobileNumber: String?) {
        val token = _uiState.value.authToken ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isUpdatingProfile = true, profileUpdateMessage = null) }
            runCatching {
                repository.updateProfile(token, firstName, lastName, mobileNumber)
            }.onSuccess { response ->
                _uiState.update {
                    it.copy(
                        isUpdatingProfile = false,
                        currentUser = response.user,
                        profileUpdateMessage = response.message,
                    )
                }
            }.onFailure { err ->
                _uiState.update { it.copy(isUpdatingProfile = false, profileUpdateMessage = err.message ?: "Update failed.") }
            }
        }
    }

    // ─── Play Store Account Deletion & Recovery ─────────────

    fun deleteAccount() {
        val token = _uiState.value.authToken ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isDeletingAccount = true) }
            runCatching {
                repository.deleteAccount(token)
            }.onSuccess { response ->
                _uiState.update {
                    it.copy(
                        isDeletingAccount = false,
                        authToken = null,
                        currentUser = null,
                        orders = emptyList(),
                        accountDeletionNotice = response.message,
                    )
                }
            }.onFailure { err ->
                _uiState.update { it.copy(isDeletingAccount = false, authError = err.message ?: "Failed to delete account.") }
            }
        }
    }

    fun requestForgotPassword(email: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSendingRecoveryEmail = true, forgotPasswordError = null, forgotPasswordSuccess = null) }
            runCatching {
                repository.forgotPassword(email)
            }.onSuccess { response ->
                _uiState.update {
                    it.copy(
                        isSendingRecoveryEmail = false,
                        forgotPasswordSuccess = response.message,
                    )
                }
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isSendingRecoveryEmail = false,
                        forgotPasswordError = err.message ?: "Failed to send recovery email.",
                    )
                }
            }
        }
    }

    fun submitResetPassword(email: String, token: String, newPass: String, confirmPass: String) {
        if (newPass != confirmPass) {
            _uiState.update { it.copy(resetPasswordError = "Passwords do not match.") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isResettingPassword = true, resetPasswordError = null, resetPasswordSuccess = null) }
            runCatching {
                repository.resetPassword(email, token, newPass, confirmPass)
            }.onSuccess { response ->
                _uiState.update {
                    it.copy(
                        isResettingPassword = false,
                        resetPasswordSuccess = response.message,
                        showResetPasswordDialog = false,
                    )
                }
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isResettingPassword = false,
                        resetPasswordError = err.message ?: "Password reset failed.",
                    )
                }
            }
        }
    }

    fun setForgotPasswordDialog(show: Boolean) {
        _uiState.update { it.copy(showForgotPasswordDialog = show, forgotPasswordError = null, forgotPasswordSuccess = null) }
    }

    fun setResetPasswordDialog(show: Boolean) {
        _uiState.update { it.copy(showResetPasswordDialog = show, resetPasswordError = null, resetPasswordSuccess = null) }
    }

    fun dismissAuthSuccess() {
        _uiState.update { it.copy(authSuccess = null) }
    }

    fun dismissProfileMessage() {
        _uiState.update { it.copy(profileUpdateMessage = null) }
    }

    fun dismissDeletionNotice() {
        _uiState.update { it.copy(accountDeletionNotice = null) }
    }

    // ─── Delivery & Shipping ────────────────────────────────

    fun fetchShopInfo() {
        viewModelScope.launch {
            runCatching { repository.getShopInfo() }
                .onSuccess { info -> _uiState.update { it.copy(shopInfo = info) } }
        }
    }

    fun setShippingAddress(address: String) {
        _uiState.update { it.copy(shippingAddress = address) }
    }

    fun setDeliveryCoordinates(lat: Double, lon: Double) {
        _uiState.update { it.copy(deliveryLatitude = lat, deliveryLongitude = lon) }
        validateDeliveryAddress(lat, lon)
    }

    fun validateDeliveryAddress(lat: Double, lon: Double) {
        viewModelScope.launch {
            _uiState.update { it.copy(isValidatingDelivery = true) }
            runCatching { repository.validateDelivery(lat, lon) }
                .onSuccess { result ->
                    _uiState.update { it.copy(deliveryValidation = result, isValidatingDelivery = false) }
                }
                .onFailure {
                    _uiState.update { it.copy(isValidatingDelivery = false) }
                }
        }
    }

    // ─── Checkout ───────────────────────────────────────────

    fun startRazorpayCheckout() {
        val state = _uiState.value
        val now = System.currentTimeMillis()

        if (state.currentUser == null || state.authToken == null) {
            _uiState.update { it.copy(checkoutError = "Please log in or register before placing an order.") }
            showAuth(true)
            return
        }

        if (state.shippingAddress.isBlank() || state.shippingAddress.length < 5) {
            _uiState.update { it.copy(checkoutError = "Please enter a valid shipping address.") }
            return
        }

        if (state.deliveryValidation != null && !state.deliveryValidation.allowed) {
            _uiState.update { it.copy(checkoutError = state.deliveryValidation.message) }
            return
        }

        if (now - lastCheckoutClickTime < checkoutCooldownWindowMs) {
            return
        }

        if (state.isCheckingOut || state.cart.isEmpty()) {
            return
        }

        lastCheckoutClickTime = now

        viewModelScope.launch {
            _uiState.update { it.copy(isCheckingOut = true, checkoutError = null, cooldownRemainingMs = checkoutCooldownWindowMs) }

            launch {
                var remaining = checkoutCooldownWindowMs
                while (remaining > 0) {
                    delay(250)
                    remaining -= 250
                    _uiState.update { it.copy(cooldownRemainingMs = maxOf(0L, remaining)) }
                }
            }

            val user = _uiState.value.currentUser ?: run {
                _uiState.update { it.copy(isCheckingOut = false, error = "Please sign in to complete checkout") }
                return@launch
            }
            val items = _uiState.value.cart.map { OrderItemRequest(it.product.id, it.quantity) }
            val discountCode = _uiState.value.discount?.let { if (it.valid) it.code else null }

            runCatching {
                val orderResponse = repository.createOrder(
                    token = _uiState.value.authToken,
                    idempotencyKey = activeIdempotencyKey,
                    items = items,
                    discountCode = discountCode,
                    customerEmail = user.email,
                    userId = user.id,
                    customerName = "${user.firstName} ${user.lastName}",
                    customerMobile = user.mobileNumber,
                    shippingAddress = _uiState.value.shippingAddress,
                    deliveryLatitude = _uiState.value.deliveryLatitude,
                    deliveryLongitude = _uiState.value.deliveryLongitude,
                    pincode = _uiState.value.pincode,
                )

                val mockPaymentId = "pay_rzp_${System.currentTimeMillis()}"
                val receipt = repository.verifyPayment(
                    idempotencyKey = activeIdempotencyKey,
                    razorpayOrderId = orderResponse.razorpayOrderId,
                    razorpayPaymentId = mockPaymentId,
                )
                receipt
            }.onSuccess { receipt ->
                activeIdempotencyKey = UUID.randomUUID().toString()
                _uiState.update {
                    it.copy(
                        isCheckingOut = false,
                        cart = emptyList(),
                        discount = null,
                        receipt = receipt,
                        checkoutError = null,
                        shippingAddress = "",
                        deliveryLatitude = null,
                        deliveryLongitude = null,
                        deliveryValidation = null,
                    )
                }
                fetchOrders()
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isCheckingOut = false,
                        checkoutError = error.message ?: "Payment transaction failed. Please try again.",
                    )
                }
            }
        }
    }

    fun dismissReceipt() {
        _uiState.update { it.copy(receipt = null) }
    }

    fun fetchOrders() {
        val token = _uiState.value.authToken ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingOrders = true) }
            runCatching {
                val status = if (_uiState.value.orderStatusFilter == "all") null else _uiState.value.orderStatusFilter
                val duration = if (_uiState.value.orderDurationFilter == "all") null else _uiState.value.orderDurationFilter
                repository.orders(token = token, status = status, duration = duration)
            }.onSuccess { orders ->
                _uiState.update { it.copy(orders = orders, isLoadingOrders = false) }
            }.onFailure { error ->
                _uiState.update { it.copy(isLoadingOrders = false, orderNotice = error.message) }
            }
        }
    }

    fun setOrderStatusFilter(status: String) {
        _uiState.update { it.copy(orderStatusFilter = status) }
        fetchOrders()
    }

    fun setOrderDurationFilter(duration: String) {
        _uiState.update { it.copy(orderDurationFilter = duration) }
        fetchOrders()
    }

    fun cancelPendingOrder(orderId: String) {
        val token = _uiState.value.authToken ?: return
        viewModelScope.launch {
            runCatching {
                repository.cancelOrder(token, orderId)
            }.onSuccess {
                _uiState.update { it.copy(orderNotice = "Order cancelled successfully.") }
                fetchOrders()
            }.onFailure { err ->
                _uiState.update { it.copy(orderNotice = err.message ?: "Failed to cancel order.") }
            }
        }
    }

    fun requestOrderCancellation(orderId: String, reason: String, preferredRefundMethod: String = "store_credit") {
        val token = _uiState.value.authToken ?: return
        viewModelScope.launch {
            runCatching {
                repository.requestCancellation(token, orderId, reason, preferredRefundMethod)
            }.onSuccess {
                _uiState.update { it.copy(orderNotice = "Cancellation request submitted for admin review.") }
                fetchOrders()
            }.onFailure { err ->
                _uiState.update { it.copy(orderNotice = err.message ?: "Failed to submit cancellation request.") }
            }
        }
    }

    fun dismissOrderNotice() {
        _uiState.update { it.copy(orderNotice = null) }
    }

    // ─── TOTP (2FA Authenticator App) ─────────────────────────

    fun setupTotp() {
        val token = _uiState.value.authToken ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isSettingUpTotp = true, totpError = null) }
            runCatching {
                repository.setupTotp(token)
            }.onSuccess { resp ->
                _uiState.update {
                    it.copy(
                        isSettingUpTotp = false,
                        showTotpSetupDialog = true,
                        totpSecret = resp.secret,
                        totpQrUrl = resp.qrCodeDataUrl,
                        totpManualKey = resp.manualEntryKey,
                        totpNotice = resp.message,
                    )
                }
            }.onFailure { err ->
                _uiState.update { it.copy(isSettingUpTotp = false, totpError = err.message ?: "Failed to set up 2FA") }
            }
        }
    }

    fun enableTotp(code: String) {
        val token = _uiState.value.authToken ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isSettingUpTotp = true, totpError = null) }
            runCatching {
                repository.enableTotp(token, code)
            }.onSuccess { resp ->
                _uiState.update {
                    it.copy(
                        isSettingUpTotp = false,
                        showTotpSetupDialog = false,
                        totpRecoveryCodes = resp.recoveryCodes,
                        totpNotice = resp.message,
                        currentUser = it.currentUser?.copy(totpEnabled = true),
                    )
                }
            }.onFailure { err ->
                _uiState.update { it.copy(isSettingUpTotp = false, totpError = err.message ?: "Failed to verify 2FA code") }
            }
        }
    }

    fun disableTotp(code: String) {
        val token = _uiState.value.authToken ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isSettingUpTotp = true, totpError = null) }
            runCatching {
                repository.disableTotp(token, code)
            }.onSuccess { resp ->
                _uiState.update {
                    it.copy(
                        isSettingUpTotp = false,
                        totpNotice = resp.message,
                        currentUser = it.currentUser?.copy(totpEnabled = false),
                    )
                }
            }.onFailure { err ->
                _uiState.update { it.copy(isSettingUpTotp = false, totpError = err.message ?: "Failed to disable 2FA") }
            }
        }
    }

    fun verifyTotp(code: String) {
        val email = _uiState.value.pendingTotpEmail
        viewModelScope.launch {
            _uiState.update { it.copy(isAuthenticating = true, totpError = null) }
            runCatching {
                repository.verifyTotp(email, code)
            }.onSuccess { resp ->
                _uiState.update {
                    it.copy(
                        isAuthenticating = false,
                        showTotpChallengeDialog = false,
                        authToken = resp.token,
                        currentUser = resp.user,
                        authSuccess = "2FA verified. Welcome back!",
                    )
                }
                fetchOrders()
            }.onFailure { err ->
                _uiState.update { it.copy(isAuthenticating = false, totpError = err.message ?: "Invalid 2FA code") }
            }
        }
    }

    fun recoverTotp(recoveryCode: String) {
        val email = _uiState.value.pendingTotpEmail
        viewModelScope.launch {
            _uiState.update { it.copy(isAuthenticating = true, totpError = null) }
            runCatching {
                repository.recoverTotp(email, recoveryCode)
            }.onSuccess { resp ->
                _uiState.update {
                    it.copy(
                        isAuthenticating = false,
                        showTotpChallengeDialog = false,
                        authToken = resp.token,
                        currentUser = resp.user,
                        authSuccess = "Account recovered using backup code. (${resp.remainingRecoveryCodes} codes remaining)",
                    )
                }
                fetchOrders()
            }.onFailure { err ->
                _uiState.update { it.copy(isAuthenticating = false, totpError = err.message ?: "Invalid recovery code") }
            }
        }
    }

    fun dismissTotpDialog() {
        _uiState.update { it.copy(showTotpChallengeDialog = false, showTotpSetupDialog = false, totpError = null, totpNotice = null) }
    }

    // ─── PIN Code Check & Location Filter ───────────────────────

    fun openPincodeDialog() {
        _uiState.update { it.copy(showPincodeDialog = true, pincodeError = null) }
    }

    fun closePincodeDialog() {
        _uiState.update { it.copy(showPincodeDialog = false, pincodeError = null) }
    }

    fun checkPincode(pincode: String) {
        val cleanPin = pincode.trim()
        if (cleanPin.length != 6 || !cleanPin.all { it.isDigit() }) {
            _uiState.update { it.copy(pincodeError = "Please enter a valid 6-digit PIN code.") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isCheckingPincode = true, pincodeError = null) }
            runCatching {
                repository.checkPincode(cleanPin)
            }.onSuccess { result ->
                _uiState.update { state ->
                    val nextCity = result.city ?: state.selectedCity
                    val prefilledAddress = if (state.shippingAddress.isBlank()) "PIN: $cleanPin, $nextCity" else state.shippingAddress
                    state.copy(
                        isCheckingPincode = false,
                        pincodeCheckResult = result,
                        selectedPincode = cleanPin,
                        selectedCity = nextCity,
                        shippingAddress = prefilledAddress,
                    )
                }
            }.onFailure { err ->
                _uiState.update { it.copy(isCheckingPincode = false, pincodeError = err.message ?: "Failed to check PIN code.") }
            }
        }
    }

    fun setPincodeFilter(enabled: Boolean) {
        _uiState.update { it.copy(isPincodeFilterActive = enabled) }
    }
}

class StorefrontViewModelFactory : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return StorefrontViewModel(StorefrontRepository(com.rajtraders.shop.data.NetworkModule.api)) as T
    }
}