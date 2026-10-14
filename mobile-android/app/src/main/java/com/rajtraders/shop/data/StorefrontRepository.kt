package com.rajtraders.shop.data

class StorefrontRepository(private val api: StorefrontApi) {
    private val fallbackProducts = listOf(
        Product(
            id = "prod_cake_belgian_choco",
            name = "Belgian Chocolate Truffle Cake (1kg)",
            slug = "belgian-chocolate-truffle-cake",
            description = "Rich Belgian dark chocolate ganache layered between moist chocolate sponge.",
            priceCents = 129900,
            compareAtPriceCents = 149900,
            category = "Cakes & Desserts",
            imageUrl = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80",
            status = "active",
            featured = true,
            inventory = 15,
            prepTimeMinutes = 45,
            createdAt = "2026-09-12T00:00:00Z",
            updatedAt = "2026-09-12T00:00:00Z",
        ),
        Product(
            id = "prod_cake_strawberry_bliss",
            name = "Fresh Strawberry Cream Cake (1kg)",
            slug = "fresh-strawberry-cream-cake",
            description = "Light vanilla sponge infused with fresh Mahabaleshwar strawberry coulis.",
            priceCents = 109900,
            compareAtPriceCents = 129900,
            category = "Cakes & Desserts",
            imageUrl = "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=900&q=80",
            status = "active",
            featured = true,
            inventory = 20,
            prepTimeMinutes = 30,
            createdAt = "2026-09-12T00:00:00Z",
            updatedAt = "2026-09-12T00:00:00Z",
        ),
    )

    private val fallbackSummary = StorefrontSummary(
        shopName = "RAJ TRADERS",
        featuredCount = 2,
        categories = listOf("Apparel", "Home"),
        firstOrderOffer = "WELCOME10",
        updatedAt = "2026-09-12T00:00:00Z",
    )

    suspend fun products(search: String? = null, category: String? = null): List<Product> = try {
        api.listProducts(search, category)
    } catch (e: Exception) {
        fallbackProducts.filter { p ->
            (category == null || p.category.equals(category, ignoreCase = true)) &&
            (search.isNullOrBlank() || p.name.contains(search, ignoreCase = true) || p.description.contains(search, ignoreCase = true))
        }
    }

    suspend fun summary(): StorefrontSummary = try {
        api.getSummary()
    } catch (e: Exception) {
        fallbackSummary
    }

    suspend fun eligibility(email: String) = api.checkEligibility(EmailRequest(email))

    suspend fun claim(email: String) = api.claimOffer(EmailRequest(email))

    suspend fun discount(code: String, subtotalCents: Int, isFirstOrder: Boolean) =
        api.validateDiscount(DiscountRequest(code, subtotalCents, isFirstOrder))

    suspend fun getActiveCoupons(token: String?): List<CustomerCoupon> = try {
        api.getActiveCoupons(token?.let { "Bearer $it" })
    } catch (_: Exception) {
        emptyList()
    }

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

    suspend fun checkPincode(pincode: String): PincodeCheckResponse = try {
        api.checkPincode(PincodeCheckRequest(pincode))
    } catch (e: Exception) {
        val cleanPin = pincode.trim()
        val isValid = cleanPin.matches(Regex("^[1-9][0-9]{5}$"))
        if (!isValid) {
            PincodeCheckResponse(allowed = false, message = "Please enter a valid 6-digit Indian PIN code.")
        } else {
            val city = when {
                cleanPin == "484551" -> "Birsinghpur Pali"
                cleanPin == "484661" -> "Nowrozabad"
                cleanPin == "484660" -> "Chandia"
                cleanPin.startsWith("482") -> "Jabalpur"
                cleanPin.startsWith("484") -> "Shahdol / Umaria"
                cleanPin.startsWith("40") -> "Mumbai"
                cleanPin.startsWith("411") -> "Pune"
                cleanPin.startsWith("11") -> "New Delhi"
                cleanPin.startsWith("56") -> "Bengaluru"
                cleanPin.startsWith("70") -> "Kolkata"
                cleanPin.startsWith("60") -> "Chennai"
                cleanPin.startsWith("50") -> "Hyderabad"
                cleanPin.startsWith("38") -> "Ahmedabad"
                cleanPin.startsWith("302") -> "Jaipur"
                cleanPin.startsWith("462") -> "Bhopal"
                cleanPin.startsWith("452") -> "Indore"
                cleanPin.startsWith("474") -> "Gwalior"
                cleanPin.startsWith("48") -> "Madhya Pradesh"
                else -> "India"
            }
            val allowed = cleanPin == "484551"
            PincodeCheckResponse(
                allowed = allowed,
                pincode = cleanPin,
                city = city,
                estimatedDays = if (allowed) "Same Day / Scheduled Slot" else null,
                isExpressAvailable = allowed,
                message = if (allowed) "Great news! PIN code $cleanPin ($city) is fully serviceable for fast delivery in Birsinghpur Pali (484551)." else "Sorry, delivery is currently not serviceable for PIN code $cleanPin ($city). We deliver exclusively to: Birsinghpur Pali (484551)."
            )
        }
    }

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
        pincode: String? = null,
    ) = api.createOrder(
        token?.let { "Bearer $it" },
        CreateOrderRequest(
            idempotencyKey, items, discountCode, customerEmail,
            userId, customerName, customerMobile, shippingAddress,
            deliveryLatitude, deliveryLongitude, pincode
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

    suspend fun requestCancellation(token: String, orderId: String, reason: String, preferredRefundMethod: String) =
        api.requestCancellation(
            "Bearer $token",
            orderId,
            mapOf("reason" to reason, "preferredRefundMethod" to preferredRefundMethod)
        )

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

    // ─── Customer Saved Addresses ───────────────────────────────

    suspend fun listAddresses(token: String): List<CustomerAddress> =
        api.listAddresses("Bearer $token")

    suspend fun createAddress(token: String, request: CustomerAddressRequest): CustomerAddress =
        api.createAddress("Bearer $token", request)

    suspend fun updateAddress(token: String, id: String, request: CustomerAddressRequest): CustomerAddress =
        api.updateAddress("Bearer $token", id, request)

    suspend fun deleteAddress(token: String, id: String): GenericResponse =
        api.deleteAddress("Bearer $token", id)

    // ─── Customer Notifications ─────────────────────────────────

    suspend fun listNotifications(token: String): NotificationsResponse =
        api.listNotifications("Bearer $token")

    suspend fun markAllNotificationsRead(token: String): GenericResponse =
        api.markAllNotificationsRead("Bearer $token")
}