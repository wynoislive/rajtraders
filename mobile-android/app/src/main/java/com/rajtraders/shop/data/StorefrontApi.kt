package com.rajtraders.shop.data

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface StorefrontApi {
    @GET("v1/products")
    suspend fun listProducts(
        @Query("search") search: String? = null,
        @Query("category") category: String? = null,
    ): List<Product>

    @GET("v1/storefront/summary")
    suspend fun getSummary(): StorefrontSummary

    @POST("v1/registrations/eligibility")
    suspend fun checkEligibility(@Body body: EmailRequest): RegistrationEligibility

    @POST("v1/registrations/claim")
    suspend fun claimOffer(@Body body: EmailRequest): RegistrationClaim

    @POST("v1/discounts/validate")
    suspend fun validateDiscount(@Body body: DiscountRequest): DiscountValidation

    // ─── Auth, Password Recovery & Account Deletion ─────────

    @POST("v1/auth/register")
    suspend fun register(@Body body: RegisterRequest): LoginResponse

    @POST("v1/auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @POST("v1/auth/verify-login-otp")
    suspend fun verifyLoginOtp(@Body body: VerifyLoginOtpRequest): AuthResponse

    @POST("v1/auth/resend-login-otp")
    suspend fun resendLoginOtp(@Body body: ResendLoginOtpRequest): GenericResponse

    @GET("v1/auth/me")
    suspend fun getProfile(@Header("Authorization") token: String): UserProfile

    @PUT("v1/auth/profile")
    suspend fun updateProfile(
        @Header("Authorization") token: String,
        @Body body: UpdateProfileRequest,
    ): UpdateProfileResponse

    @DELETE("v1/auth/delete-account")
    suspend fun deleteAccount(@Header("Authorization") token: String): DeleteAccountResponse

    @POST("v1/auth/forgot-password")
    suspend fun forgotPassword(@Body body: ForgotPasswordRequest): GenericResponse

    @POST("v1/auth/reset-password")
    suspend fun resetPassword(@Body body: ResetPasswordRequest): GenericResponse

    // ─── Checkout & Delivery ────────────────────────────────

    @GET("v1/checkout/shop-info")
    suspend fun getShopInfo(): ShopInfoResponse

    @POST("v1/checkout/validate-delivery")
    suspend fun validateDelivery(@Body body: DeliveryValidationRequest): DeliveryValidationResponse

    @POST("v1/checkout/create-order")
    suspend fun createOrder(
        @Header("Authorization") token: String?,
        @Body body: CreateOrderRequest,
    ): CreateOrderResponse

    @POST("v1/checkout/verify-payment")
    suspend fun verifyPayment(@Body body: VerifyPaymentRequest): OrderReceipt

    @GET("v1/checkout/orders")
    suspend fun listOrders(
        @Header("Authorization") token: String,
        @Query("status") status: String? = null,
        @Query("duration") duration: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null,
        @Query("search") search: String? = null,
    ): List<OrderHistoryItem>

    @POST("v1/checkout/orders/{id}/cancel")
    suspend fun cancelOrder(
        @Header("Authorization") token: String,
        @Path("id") id: String,
    ): Map<String, Any>

    // ─── TOTP (Two-Factor Authentication) ───────────────────

    @POST("v1/auth/totp/setup")
    suspend fun setupTotp(
        @Header("Authorization") token: String,
    ): TotpSetupResponse

    @POST("v1/auth/totp/enable")
    suspend fun enableTotp(
        @Header("Authorization") token: String,
        @Body body: TotpVerifyRequest,
    ): TotpEnableResponse

    @POST("v1/auth/totp/disable")
    suspend fun disableTotp(
        @Header("Authorization") token: String,
        @Body body: TotpVerifyRequest,
    ): GenericResponse

    @POST("v1/auth/totp/verify")
    suspend fun verifyTotp(
        @Body body: TotpLoginVerifyRequest,
    ): AuthResponse

    @POST("v1/auth/totp/recover")
    suspend fun recoverTotp(
        @Body body: TotpRecoveryRequest,
    ): TotpRecoveryResponse
}