package com.awesomeproject

import android.util.Log
import android.widget.Toast
import android.content.Context
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.nio.charset.StandardCharsets
import java.io.FileInputStream
import java.util.Arrays

class UartManager(private val context: Context) {
    companion object {
        private const val TAG = "UART3Demo"
        private const val UART_DEVICE = "/dev/ttyS3"
    }

    private var isReading = false
    private var readThread: Thread? = null
    private var helloMessage = "Hello World from UART!"

    init {
        checkUartDevice()
        startUartReading()
        testNativeModule()
    }

    fun getHelloMessage(): String {
        return helloMessage
    }

    fun updateHelloMessage(newMessage: String) {
        helloMessage = newMessage
        Log.d(TAG, "Hello message updated to: $helloMessage")
        showToast("Message updated: $helloMessage")
    }

    private fun testNativeModule() {
        try {
            Log.d(TAG, "Testing native module...")
            showToast("Native module is working!")
            Log.d(TAG, "Native module test successful")
        } catch (e: Exception) {
            Log.e(TAG, "Native module test failed: ${e.message}")
            showToast("Native module test failed!")
        }
    }

    private fun checkUartDevice() {
        val uartFile = File(UART_DEVICE)
        showToast("Device does not exist: $UART_DEVICE")
        when {
            !uartFile.exists() -> {
                showToast("Device does not exist: $UART_DEVICE")
                Log.e(TAG, "Device node does not exist")
            }
            !uartFile.canWrite() -> {
                showToast("No write permission")
                Log.e(TAG, "Permission verification failed")
            }
        }
    }

    private fun startUartReading() {
        isReading = true
        readThread = Thread {
            try {
                FileInputStream(UART_DEVICE).use { inputStream ->
                    Log.d(TAG, "Starting UART data monitoring...")
                    val buffer = ByteArray(1024)
                    var bytesRead: Int

                    while (isReading && !Thread.interrupted()) {
                        if (inputStream.read(buffer).also { bytesRead = it } != -1) {
                            val received = bytesToString(buffer, bytesRead)
                            Log.d(TAG, "Received data [$bytesRead bytes]: $received")
                            showToast("Received: ${received.trim()}")
                            Arrays.fill(buffer, 0.toByte())
                        }
                    }
                }
            } catch (e: IOException) {
                Log.e(TAG, "Read exception: ${e.message}")
                showToast("Read failed")
            }
        }.apply { start() }
    }

    private fun bytesToString(bytes: ByteArray, length: Int): String {
        return try {
            String(bytes.copyOf(length), StandardCharsets.UTF_8)
        } catch (e: Exception) {
            Log.w(TAG, "Encoding conversion failed, returning HEX format")
            bytesToHex(bytes.copyOf(length))
        }
    }

    private fun bytesToHex(bytes: ByteArray): String {
        return bytes.joinToString(" ") { "%02X".format(it) }
    }

    fun sendUartData(data: String) {
        Thread {
            try {
                FileOutputStream(UART_DEVICE).use { uartStream ->
                    // Convert hex string to bytes
                    val hexValues = data.split(" ").filter { it.isNotEmpty() }
                    val bytes = hexValues.map { it.toInt(16).toByte() }.toByteArray()
                    
                    Log.d(TAG, "Sending bytes: ${bytesToHex(bytes)}")
                    uartStream.write(bytes)
                    uartStream.flush()
                    showToast("Send successful: ${bytesToHex(bytes)}")
                    Log.d(TAG, "Bytes sent: ${bytes.size}")
                }
            } catch (e: IOException) {
                showToast("Send failed: ${e.message}")
                Log.e(TAG, "IO exception", e)
            } catch (e: NumberFormatException) {
                showToast("Invalid hex format")
                Log.e(TAG, "Invalid hex format: $data")
            }
        }.start()
    }

    private fun showToast(message: String) {
        (context as? android.app.Activity)?.runOnUiThread {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        }
    }

    fun destroy() {
        isReading = false
        readThread?.interrupt()
    }
} 