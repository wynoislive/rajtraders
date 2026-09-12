package com.rajtraders.shop.data

import com.rajtraders.shop.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object NetworkModule {
    const val DEFAULT_API_URL = "https://api.sundarvan.xyz/api/"

    val resolvedBaseUrl: String
        get() {
            val configUrl = BuildConfig.API_BASE_URL.trim()
            return if (configUrl.isBlank() || 
                configUrl.contains("127.0.0.1") || 
                configUrl.contains("localhost") || 
                configUrl.contains("10.0.2.2") || 
                configUrl.contains("9000")
            ) {
                DEFAULT_API_URL
            } else {
                if (configUrl.endsWith("/")) configUrl else "$configUrl/"
            }
        }

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) {
                    HttpLoggingInterceptor.Level.BASIC
                } else {
                    HttpLoggingInterceptor.Level.NONE
                }
            },
        )
        .build()

    val api: StorefrontApi by lazy {
        Retrofit.Builder()
            .baseUrl(resolvedBaseUrl)
            .client(httpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(StorefrontApi::class.java)
    }
}