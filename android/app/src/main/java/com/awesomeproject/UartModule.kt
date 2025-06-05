package com.awesomeproject

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import android.util.Log

class UartModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val TAG = "UartModule"
    private var uartManager: UartManager? = null

    override fun getName() = "UartModule"

    @ReactMethod
    fun getHelloWorld(promise: Promise) {
        promise.resolve("Hello World from Native Module!")
    }

    @ReactMethod
    fun initializeUart(promise: Promise) {
        try {
            uartManager = UartManager(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize UART: ${e.message}")
            promise.reject("UART_ERROR", e.message)
        }
    }

    @ReactMethod
    fun sendData(data: String, promise: Promise) {
        try {
            Log.d(TAG, "Sending data to UART: $data")
            uartManager?.sendUartData(data)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send data: ${e.message}")
            promise.reject("UART_ERROR", e.message)
        }
    }

    @ReactMethod
    fun cleanup(promise: Promise) {
        try {
            uartManager?.destroy()
            uartManager = null
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to cleanup: ${e.message}")
            promise.reject("UART_ERROR", e.message)
        }
    }
} 