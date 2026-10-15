package com.rajtraders.shop.data

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

class CartSessionStorage(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("raj_traders_session_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    companion object {
        private const val KEY_CART_ITEMS = "raj_cart_items_json"
        private const val KEY_AUTH_TOKEN = "raj_auth_token"
        private const val KEY_CURRENT_USER = "raj_current_user_json"
        private const val KEY_SELECTED_PINCODE = "raj_selected_pincode"
        private const val KEY_SELECTED_CITY = "raj_selected_city"
        private const val KEY_RECEIVER_NAME = "raj_receiver_name"
        private const val KEY_RECEIVER_PHONE = "raj_receiver_phone"
        private const val KEY_SHIPPING_ADDRESS = "raj_shipping_address"
    }

    // ── Cart Persistence ──────────────────────────────────────

    fun saveCart(cart: List<CartLine>) {
        try {
            val json = gson.toJson(cart)
            prefs.edit().putString(KEY_CART_ITEMS, json).apply()
        } catch (_: Exception) {}
    }

    fun loadCart(): List<CartLine> {
        return try {
            val json = prefs.getString(KEY_CART_ITEMS, null) ?: return emptyList()
            val type = object : TypeToken<List<CartLine>>() {}.type
            gson.fromJson<List<CartLine>>(json, type) ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun clearCart() {
        prefs.edit().remove(KEY_CART_ITEMS).apply()
    }

    // ── Auth & User Session ───────────────────────────────────

    fun saveAuthSession(token: String?, user: UserProfile?) {
        val editor = prefs.edit()
        if (token != null) {
            editor.putString(KEY_AUTH_TOKEN, token)
        } else {
            editor.remove(KEY_AUTH_TOKEN)
        }
        if (user != null) {
            editor.putString(KEY_CURRENT_USER, gson.toJson(user))
        } else {
            editor.remove(KEY_CURRENT_USER)
        }
        editor.apply()
    }

    fun getAuthToken(): String? = prefs.getString(KEY_AUTH_TOKEN, null)

    fun getCurrentUser(): UserProfile? {
        return try {
            val json = prefs.getString(KEY_CURRENT_USER, null) ?: return null
            gson.fromJson(json, UserProfile::class.java)
        } catch (_: Exception) {
            null
        }
    }

    fun clearAuthSession() {
        prefs.edit()
            .remove(KEY_AUTH_TOKEN)
            .remove(KEY_CURRENT_USER)
            .apply()
    }

    // ── Delivery Location & Contact ───────────────────────────

    fun saveLocation(pincode: String, city: String) {
        prefs.edit()
            .putString(KEY_SELECTED_PINCODE, pincode)
            .putString(KEY_SELECTED_CITY, city)
            .apply()
    }

    fun getSelectedPincode(): String = prefs.getString(KEY_SELECTED_PINCODE, "484551") ?: "484551"
    fun getSelectedCity(): String = prefs.getString(KEY_SELECTED_CITY, "Birsinghpur Pali, MP") ?: "Birsinghpur Pali, MP"

    fun saveContactInfo(name: String, phone: String, address: String) {
        prefs.edit()
            .putString(KEY_RECEIVER_NAME, name)
            .putString(KEY_RECEIVER_PHONE, phone)
            .putString(KEY_SHIPPING_ADDRESS, address)
            .apply()
    }

    fun getReceiverName(): String = prefs.getString(KEY_RECEIVER_NAME, "") ?: ""
    fun getReceiverPhone(): String = prefs.getString(KEY_RECEIVER_PHONE, "") ?: ""
    fun getShippingAddress(): String = prefs.getString(KEY_SHIPPING_ADDRESS, "") ?: ""
}
