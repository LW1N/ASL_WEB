import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Platform, TextInput } from "react-native";
import { Camera, CameraType, useCameraPermissions } from "expo-camera";

const SERVER_URL = "http://YOUR_LOCAL_IP:5000/predict"; // ← change me (e.g., http://192.168.1.10:5000/predict)

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isStreaming, setIsStreaming] = useState(false);
  const [prediction, setPrediction] = useState("Waiting for prediction…");
  const [note, setNote] = useState("");
  const cameraRef = useRef(null);
  const streamingRef = useRef(false);
  const inFlightRef = useRef(false); // prevent overlapping requests
  const timerRef = useRef(null);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  useEffect(() => {
    // start streaming automatically when permission is granted
    if (permission?.granted && !isStreaming) {
      setIsStreaming(true);
    }
    return () => stopStreaming();
  }, [permission]);

  useEffect(() => {
    if (isStreaming) startStreaming();
    else stopStreaming();
    return () => stopStreaming();
  }, [isStreaming]);

  const startStreaming = () => {
    if (timerRef.current) return;
    streamingRef.current = true;
    // Grab a frame every 500ms. Tune as needed.
    timerRef.current = setInterval(captureAndSendFrame, 500);
  };

  const stopStreaming = () => {
    streamingRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const captureAndSendFrame = async () => {
    if (!cameraRef.current || inFlightRef.current) return;
    try {
      inFlightRef.current = true;
      // lower quality & base64 to keep payload tiny
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.25, // 0..1 (tradeoff between size/clarity)
        skipProcessing: true,
        base64: true,
      });

      if (!photo?.base64) return;

      const body = JSON.stringify({
        image_base64: photo.base64, // raw base64 string (no data URI prefix)
        // optionally send metadata you care about:
        width: photo.width,
        height: photo.height,
        note, // shows how you could pass extra text if needed
      });

      const res = await fetch(SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!res.ok) {
        throw new Error(`Server error ${res.status}`);
      }
      const data = await res.json();
      setPrediction(
        typeof data?.prediction === "string"
          ? data.prediction
          : JSON.stringify(data)
      );
    } catch (err) {
      setPrediction(String(err.message || err));
    } finally {
      inFlightRef.current = false;
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Checking camera permissions…</Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ textAlign: "center", marginBottom: 12 }}>
          We need your permission to show the camera
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Centered live preview */}
      <View style={styles.previewWrapper}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={CameraType.back}
          ratio="16:9"
        />
      </View>

      {/* Simple text box under the video */}
      <View style={styles.textBox}>
        <Text style={styles.label}>Model Prediction</Text>
        <Text style={styles.prediction} numberOfLines={2}>
          {prediction}
        </Text>

        {/* Optional: small input you can use to send along with frames */}
        <TextInput
          style={styles.input}
          placeholder="Optional note to send with frames…"
          value={note}
          onChangeText={setNote}
        />

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, isStreaming ? styles.secondary : styles.primary]}
            onPress={() => setIsStreaming(s => !s)}
          >
            <Text style={styles.buttonText}>
              {isStreaming ? "Pause" : "Resume"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const PREVIEW_WIDTH = 320;   // tweak to your liking
const PREVIEW_HEIGHT = 180;  // matches 16:9 above

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b0b",
    paddingTop: Platform.select({ ios: 60, android: 40 }),
    alignItems: "center",
  },
  previewWrapper: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
  },
  camera: {
    width: "100%",
    height: "100%",
  },
  textBox: {
    width: PREVIEW_WIDTH,
    marginTop: 12,
    padding: 12,
    backgroundColor: "#151515",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    gap: 8,
  },
  label: {
    color: "#aaa",
    fontSize: 12,
    marginBottom: 2,
  },
  prediction: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    marginTop: 8,
    backgroundColor: "#0f0f0f",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#ddd",
  },
  row: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primary: { backgroundColor: "#2563eb" },
  secondary: { backgroundColor: "#475569" },
  buttonText: { color: "white", fontWeight: "600" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});
