package com.harborlane.shop.data

class StorefrontRepository(private val api: StorefrontApi) {
    suspend fun products(search: String? = null, category: String? = null) =
        api.listProducts(search, category)

    suspend fun summary() = api.getSummary()

    suspend fun eligibility(email: String) = api.checkEligibility(EmailRequest(email))

    suspend fun claim(email: String) = api.claimOffer(EmailRequest(email))

    suspend fun discount(code: String, subtotalCents: Int, isFirstOrder: Boolean) =
        api.validateDiscount(DiscountRequest(code, subtotalCents, isFirstOrder))

    // ─── Auth & Security ────────────────────────────────────

    suspend fun register(
        firstName: String, lastName: String, mobileNumber: String,
        email: String, password: String, confirmPassword: String,
    ) = api.register(RegisterRequest(firstName, lastName, mobileNumber, email, password, confirmPassword))

    suspend fun login(email: String, password: String) =
        api.login(LoginRequest(email, password))

    suspend fun verifyLoginOtp(email: String, otpCode: String) =
        api.verifyLoginOtp(VerifyLoginOtpRequest(email, otpCode))

    suspend fun resendLoginOtp(email: String) =
        api.resendLoginOtp(ResendLoginOtpRequest(email))

    suspend fun getProfile(token: String) =
        api.getProfile("Bearer $token")

    suspend fun updateProfile(token: String, firstName: String?, lastName: String?, mobileNumber: String?) =
        api.updateProfile("Bearer $token", UpdateProfileRequest(firstName, lastName, mobileNumber))

    suspend fun deleteAccount(token: String) =
        api.deleteAccount("Bearer $token")

    suspend fun forgotPassword(email: String) =
        api.forgotPassword(ForgotPasswordRequest(email))

    suspend fun resetPassword(email: String, token: String, newPass: String, confirmPass: String) =
        api.resetPassword(ResetPasswordRequest(email, token, newPass, confirmPass))

    // ─── Checkout & Delivery ────────────────────────────────

    suspend fun getShopInfo() = api.getShopInfo()

    suspend fun validateDelivery(latitude: Double, longitude: Double) =
        api.validateDelivery(DeliveryValidationRequest(latitude, longitude))

    suspend fun createOrder(
        token: String?,
        idempotencyKey: String,
        items: List<OrderItemRequest>,
        discountCode: String? = null,
        customerEmail: String? = null,
        userId: String? = null,
        customerName: String? = null,
        customerMobile: String? = null,
        shippingAddress: String? = null,
        deliveryLatitude: Double? = null,
        deliveryLongitude: Double? = null,
    ) = api.createOrder(
        token?.let { "Bearer $it" },
        CreateOrderRequest(
            idempotencyKey, items, discountCode, customerEmail,
            userId, customerName, customerMobile, shippingAddress,
            deliveryLatitude, deliveryLongitude,
        )
    )

    suspend fun verifyPayment(
        idempotencyKey: String,
        razorpayOrderId: String,
        razorpayPaymentId: String,
        signature: String? = null,
    ) = api.verifyPayment(VerifyPaymentRequest(idempotencyKey, razorpayOrderId, razorpayPaymentId, signature))

    suspend fun orders(
        token: String,
        status: String? = null,
        duration: String? = null,
        startDate: String? = null,
        endDate: String? = null,
        search: String? = null,
    ) = api.listOrders("Bearer $token", status, duration, startDate, endDate, search)

    suspend fun cancelOrder(token: String, orderId: String) =
        api.cancelOrder("Bearer $token", orderId)

    // ─── TOTP (2FA) ─────────────────────────────────────────

    suspend fun setupTotp(token: String) =
        api.setupTotp("Bearer $token")

    suspend fun enableTotp(token: String, code: String) =
        api.enableTotp("Bearer $token", TotpVerifyRequest(code))

    suspend fun disableTotp(token: String, code: String) =
        api.disableTotp("Bearer $token", TotpVerifyRequest(code))

    suspend fun verifyTotp(email: String, code: String) =
        api.verifyTotp(TotpLoginVerifyRequest(email, code))

    suspend fun recoverTotp(email: String, recoveryCode: String) =
        api.recoverTotp(TotpRecoveryRequest(email, recoveryCode))
}