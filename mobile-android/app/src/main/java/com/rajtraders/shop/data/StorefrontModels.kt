package com.rajtraders.shop.data

data class Product(
    val id: String,
    val name: String,
    val slug: String,
    val description: String,
    val priceCents: Int,
    val compareAtPriceCents: Int?,
    val category: String,
    val imageUrl: String,
    val status: String,
    val featured: Boolean,
    val inventory: Int,
    val prepTimeMinutes: Int = 30,
    val createdAt: String,
    val updatedAt: String,
)

data class StorefrontSummary(
    val shopName: String = "RAJ TRADERS",
    val featuredCount: Int,
    val categories: List<String>,
    val firstOrderOffer: String,
    val updatedAt: String,
)

data class RegistrationEligibility(
    val eligible: Boolean,
    val reason: String,
    val offerCode: String?,
)

data class RegistrationClaim(
    val claimed: Boolean,
    val offerCode: String?,
    val message: String,
)

data class DiscountValidation(
    val valid: Boolean,
    val code: String,
    val discountCents: Int,
    val message: String,
)

data class EmailRequest(val email: String)

data class DiscountRequest(
    val code: String,
    val subtotalCents: Int,
    val isFirstOrder: Boolean,
)

data class OrderItemRequest(
    val productId: String,
    val quantity: Int,
)

data class CreateOrderRequest(
    val idempotencyKey: String,
    val items: List<OrderItemRequest>,
    val discountCode: String? = null,
    val customerEmail: String? = null,
    val userId: String? = null,
    val customerName: String? = null,
    val customerMobile: String? = null,
    val shippingAddress: String? = null,
    val deliveryLatitude: Double? = null,
    val deliveryLongitude: Double? = null,
    val pincode: String? = null,
)

data class CreateOrderResponse(
    val orderId: String,
    val razorpayOrderId: String,
    val amountCents: Int,
    val currency: String,
    val keyId: String,
    val status: String,
    val idempotencyKey: String,
)

data class VerifyPaymentRequest(
    val idempotencyKey: String,
    val razorpayOrderId: String,
    val razorpayPaymentId: String,
    val razorpaySignature: String? = null,
)

data class OrderReceipt(
    val success: Boolean,
    val orderId: String,
    val razorpayOrderId: String,
    val razorpayPaymentId: String,
    val amountCents: Int,
    val currency: String,
    val status: String,
    val createdAt: String?,
    val message: String,
)

data class OrderHistoryItem(
    val id: String,
    val idempotencyKey: String,
    val razorpayOrderId: String,
    val razorpayPaymentId: String?,
    val customerEmail: String?,
    val customerName: String?,
    val customerMobile: String?,
    val shippingAddress: String?,
    val subtotalCents: Int,
    val discountCents: Int,
    val totalCents: Int,
    val currency: String,
    val status: String,
    val itemsJson: String,
    val createdAt: String,
    val updatedAt: String,
    val riderName: String? = null,
    val riderPhone: String? = null,
    val dispatchSlot: String? = null,
    val trackingUrl: String? = null,
    val cancellationStatus: String? = null,
    val cancellationReason: String? = null,
    val preferredRefundMethod: String? = null,
    val taxableAmountCents: Int? = null,
    val cgstCents: Int? = null,
    val sgstCents: Int? = null,
)

// ─── Auth & Security Models ─────────────────────────────────

data class RegisterRequest(
    val firstName: String,
    val lastName: String,
    val mobileNumber: String,
    val email: String,
    val password: String,
    val confirmPassword: String,
)

data class LoginRequest(
    val email: String,
    val password: String,
    val bypassOtp: Boolean? = false,
)

data class LoginResponse(
    val success: Boolean? = null,
    val requiresVerification: Boolean? = null,
    val requiresTotpVerification: Boolean? = null,
    val email: String? = null,
    val message: String? = null,
    val token: String? = null,
    val user: UserProfile? = null,
    val previewUrl: String? = null,
    val lockdownPenaltyNotice: String? = null,
)

data class VerifyLoginOtpRequest(
    val email: String,
    val otpCode: String,
)

data class ResendLoginOtpRequest(
    val email: String,
)

data class AuthResponse(
    val success: Boolean,
    val token: String,
    val user: UserProfile,
    val lockdownPenaltyNotice: String? = null,
)

data class UserProfile(
    val id: String,
    val firstName: String,
    val lastName: String,
    val mobileNumber: String,
    val email: String,
    val totpEnabled: Boolean? = false,
)

data class UpdateProfileRequest(
    val firstName: String? = null,
    val lastName: String? = null,
    val mobileNumber: String? = null,
)

data class UpdateProfileResponse(
    val success: Boolean,
    val message: String,
    val user: UserProfile,
)

data class ForgotPasswordRequest(
    val email: String,
)

data class ResetPasswordRequest(
    val email: String,
    val token: String,
    val newPassword: String,
    val confirmPassword: String,
)

data class GenericResponse(
    val success: Boolean,
    val message: String,
    val previewUrl: String? = null,
)

data class DeleteAccountResponse(
    val success: Boolean,
    val message: String,
    val penaltyExpiresAt: String?,
)

// ─── Delivery Validation Models ─────────────────────────────

data class DeliveryValidationRequest(
    val latitude: Double,
    val longitude: Double,
)

data class DeliveryValidationResponse(
    val allowed: Boolean,
    val distanceKm: Double,
    val radiusKm: Double,
    val message: String,
    val shopLatitude: Double? = null,
    val shopLongitude: Double? = null,
)

data class ShopInfoResponse(
    val shopLatitude: Double,
    val shopLongitude: Double,
    val deliveryRadiusKm: Double,
    val isDeliveryEnabled: Boolean,
    val razorpayKeyId: String,
)

data class PincodeCheckRequest(
    val pincode: String,
)

data class PincodeCheckResponse(
    val allowed: Boolean,
    val pincode: String? = null,
    val city: String? = null,
    val estimatedDays: String? = null,
    val isExpressAvailable: Boolean? = null,
    val message: String,
)

data class ApiError(
    val error: String,
)

// ─── TOTP (Two-Factor Authentication) Models ─────────────────

data class TotpSetupResponse(
    val secret: String,
    val qrCodeDataUrl: String,
    val manualEntryKey: String,
    val message: String,
)

data class TotpVerifyRequest(
    val totpCode: String,
)

data class TotpLoginVerifyRequest(
    val email: String,
    val totpCode: String,
)

data class TotpRecoveryRequest(
    val email: String,
    val recoveryCode: String,
)

data class TotpEnableResponse(
    val success: Boolean,
    val recoveryCodes: List<String>,
    val message: String,
)

data class TotpRecoveryResponse(
    val success: Boolean,
    val token: String,
    val user: UserProfile,
    val remainingRecoveryCodes: Int,
    val message: String,
)