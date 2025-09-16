import { CameraMode, CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Image as ExpoImage } from "expo-image";
import * as ImageManipulator from 'expo-image-manipulator';
import { useState, useRef } from 'react';
import { Button, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image as ReactImage } from 'react-native';

import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

export default function App() {
    const [permission, requestPermission] = useCameraPermissions();
    const ref = useRef<CameraView>(null);
    const [uri, setUri] = useState<string | null>(null);
    const [mode, setMode] = useState<CameraMode>("picture");
    const [facing, setFacing] = useState<CameraType>("back");
    const [recording, setRecording] = useState(false);
    const [prediction, setPrediction] = useState<string | null>(null);

    if (!permission) {
        return null;
    }

    if (!permission.granted) {
        return (
        <View style={styles.container}>
            <Text style={{ textAlign: "center" }}>
            We need your permission to use the camera
            </Text>
            <Button onPress={requestPermission} title="Grant permission" />
        </View>
        );
    }

    // Send image uri to python backend server
    const sendPicture = async (uri: string) => {
        try{
            const pythonServer = 'http://127.0.0.1:8000/predict';

            console.log("Sending image to server:", pythonServer);

            const response = await fetch(pythonServer, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // Specify content type as JSON
                },
                body: JSON.stringify({ image: uri }), // Convert the data object to a JSON string
            });
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            const data = await response.json()
            console.log("Predicted Sign:", data?.data?.predicted_class);

            // Store prediction result in state
            setPrediction(data?.data?.predicted_class || JSON.stringify(data?.data?.predicted_class));

        } catch (error) {
            console.error("Failed to send picture to server:", error); 
        }
    };

    // Helper function to crop image to 200x200 square
    async function cropToSquare(uri: string): Promise<string> {
        return new Promise((resolve, reject) => {
            ReactImage.getSize(
                uri,
                async (width, height) => {
                    try {
                    const cropSize = 200;
                    const cropRect = {
                        originX: (width - cropSize) / 2,
                        originY: (height - cropSize) / 2,
                        width: cropSize,
                        height: cropSize,
                    };

                    const result = await ImageManipulator.manipulateAsync(
                        uri,
                        [ { crop: cropRect } ],
                        { compress: 1, format: ImageManipulator.SaveFormat.PNG, base64: true }
                    );

                    const base64Uri = `data:image/png;base64,${result.base64}`;
                    resolve(base64Uri);

                    } catch (err) {
                    reject(err);
                    }
                },
                (err) => reject(err)
            );
        });
    }



    const takePicture = async () => {
        const photo = await ref.current?.takePictureAsync();
        if (!photo?.uri) {
            console.error("No photo URI available");
            return;
        }
        setUri(photo?.uri);
        console.log("Picture taken with URI:", photo?.uri);

        
        const croppedUri = await cropToSquare(photo?.uri);

        try{
            console.log("Cropped pic URI Right before send:", croppedUri);
            await sendPicture(croppedUri);
        } catch (error)
        {
            console.error("Failed to send picture to server:", error); 
        }
    };

    const recordVideo = async () => {
        if (recording) {
            setRecording(false);
            ref.current?.stopRecording();
            return;
        }
        setRecording(true);
        const video = await ref.current?.recordAsync();
        console.log({ video });
    };

    const toggleMode = () => {
        setMode((prev) => (prev === "picture" ? "video" : "picture"));
    };

    const toggleFacing = () => {
        setFacing((prev) => (prev === "back" ? "front" : "back"));
    };

    const renderPicture = () => {
        return (
            <View>
                {uri && (<ExpoImage
                    source={{ uri }}
                    contentFit="contain"
                    style={{ width: 300, aspectRatio: 1 }}
                    />)
                }

                {prediction && (
                    <Text style={{ marginTop: 10, fontSize: 18, fontWeight: "bold" }}>
                    Prediction: {prediction}
                    </Text>
                )}
                <Button onPress={() => setUri(null)} title="Take another picture" />
            </View>
        );
    };

    const renderCamera = () => {
        return (
            <View style={styles.cameraWrapper}>
                <CameraView
                    style={styles.camera}
                    ref={ref}
                    mode={mode}
                    facing={facing}
                    mute={false}
                    responsiveOrientationWhenOrientationLocked
                > </CameraView>

                <View style={styles.overlayBox} />

                <View style={styles.shutterContainer}>
                <Pressable onPress={toggleMode}>
                    {mode === "picture" ? (
                    <AntDesign name="picture" size={32} color="white" />
                    ) : (
                    <Feather name="video" size={32} color="white" />
                    )}
                </Pressable>
                <Pressable onPress={mode === "picture" ? takePicture : recordVideo}>
                    {({ pressed }) => (
                    <View
                        style={[
                        styles.shutterBtn,
                        {
                            opacity: pressed ? 0.5 : 1,
                        },
                        ]}
                    >
                        <View style={styles.shutterBtnInner}>
                            <Text style={styles.shutterBtnText}>Take Picture</Text>
                        </View>
                    </View>
                    )}
                </Pressable>
                <Pressable onPress={toggleFacing}>
                    <FontAwesome6 name="rotate-left" size={32} color="white" />
                </Pressable>
                </View>
            </View>
        );
    };


    return (
        <View style={styles.container}>
        {uri ? renderPicture() : renderCamera()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
    cameraWrapper: {
        width: 500,
        height: 500,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "black",
        alignItems: "center",
    },
    camera: {
        width: "100%",
        height: "100%",
    },
    overlayBox: {
        position: "absolute",
        width: 200,
        height: 200,
        borderWidth: 2,
        borderColor: "white",
        borderStyle: "dashed",
        top: "50%",
        left: "50%",
        transform: [{ translateX: -100 }, { translateY: -100 }], // center the box
        zIndex: 10, // ensures it is above the camera
    },

    shutterContainer: {
        position: "absolute",
        top: "100%",
        width: "100%",
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
    },
    shutterBtn: {
        backgroundColor: "black",  // button background
        borderWidth: 5,
        borderColor: "black",
        width: 100,               // make it slightly bigger for text
        height: 100,
        borderRadius: 50,
        alignItems: "center",
        justifyContent: "center",
    },

    shutterBtnInner: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 50,
    },

    shutterBtnText: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center",
        fontSize: 14,
    },
});