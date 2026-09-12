package com.harborlane.shop.data

import com.harborlane.shop.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object NetworkModule {
    private const val PRODUCTION_API_URL = "https://rajtraders-api-server.vercel.app/api/"

    private val resolvedBaseUrl: String
        get() {
            val configUrl = BuildConfig.API_BASE_URL
            return if (configUrl.contains("127.0.0.1") || configUrl.contains("localhost") || configUrl.isBlank()) {
                PRODUCTION_API_URL
            } else {
                if (configUrl.endsWith("/")) configUrl else "$configUrl/"
            }
        }

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
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

    val api: StorefrontApi = Retrofit.Builder()
        .baseUrl(resolvedBaseUrl)
        .client(httpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(StorefrontApi::class.java)
}