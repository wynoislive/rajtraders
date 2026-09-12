package com.harborlane.shop.data

import com.harborlane.shop.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object NetworkModule {
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
        .baseUrl(BuildConfig.API_BASE_URL.ensureTrailingSlash())
        .client(httpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(StorefrontApi::class.java)

    private fun String.ensureTrailingSlash() = if (endsWith("/")) this else "$this/"
}