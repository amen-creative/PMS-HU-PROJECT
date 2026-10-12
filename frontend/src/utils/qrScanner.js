import LibraryQrScanner from "qr-scanner";

class QrScanner {
  constructor(videoElement, callback) {
    this.callback = callback;
    this.scanner = new LibraryQrScanner(
      videoElement,
      (result) => {
        const decoded = typeof result === "string" ? result : result?.data;
        if (decoded && this.callback) {
          console.log("QR Code detected:", decoded);
          this.callback(decoded);
        }
      },
      {
        preferredCamera: "environment",
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        onDecodeError: (error) => {
          // Ignore decode errors - they're normal when no QR code is visible
          console.debug("QR decode error (normal):", error);
        },
      }
    );
  }

  static async hasCamera() {
    return LibraryQrScanner.hasCamera();
  }

  static isSecureContext() {
    return !!(
      window.isSecureContext ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );
  }

  static async scanImage(file) {
    try {
      const result = await LibraryQrScanner.scanImage(file, {
        returnDetailedScanResult: true,
      });
      const decoded = typeof result === "string" ? result : result?.data;
      console.log("Image scan result:", decoded);
      return decoded;
    } catch (error) {
      console.error("Image scan error:", error);
      throw error;
    }
  }

  async start() {
    try {
      console.log("Starting QR scanner...");
      await this.scanner.start();
      console.log("QR scanner started successfully");
      return true;
    } catch (error) {
      console.error("Failed to start QR scanner:", error);
      throw error;
    }
  }

  stop() {
    console.log("Stopping QR scanner");
    this.scanner.stop();
  }

  destroy() {
    console.log("Destroying QR scanner");
    this.scanner.destroy();
  }
}

export default QrScanner;
