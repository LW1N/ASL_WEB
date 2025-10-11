from flask import Flask, request, jsonify
from flask_cors import CORS
from urllib import request as urlRequest
import numpy as np
import tensorflow as tf
import skimage
from skimage.transform import resize
import cv2

app = Flask(__name__)
CORS(app)

model = tf.keras.models.load_model("ASL.keras")

# Default route to check if server is running
@app.route("/")
def home():
    return "This is the ASL prediction server. Currently accepting POST requests at /predict endpoint."

# Prediction route to handle incoming image data and return model predictions
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True)
    base64_image_uri = data.get('image')
    # Python 3.4+, decode the base64 string into image data
    with urlRequest.urlopen(base64_image_uri) as response:
        received_image = response.read()
    
    # Convert image data into png file
    with open("received_image.png", "wb") as f:
        f.write(received_image)

    # Resize image to 64x64 for processing
    img = cv2.imread("received_image.png")
    img = skimage.transform.resize(img, (64, 64, 3))

    # Store image as numpy array
    img_array = np.array(img).reshape((-1, 64, 64, 3))

    # Make model prediction from image array
    predictions = model.predict(img_array)

    # DEBUG: Print raw predictions to understand output shape and values
    print("Raw model predictions:", predictions)

    # Mode output shape: (1, 29)
    predicted_class = np.argmax(predictions, axis=1)[0]

    # List of class names corresponding to model output indices
    class_names = [
    'A','B','C','D','E','F','G','H','I','J',
    'K','L','M','N','O','P','Q','R','S','T',
    'U','V','W','X','Y','Z','del','nothing','space'
    ]

    # Find the index of the highest prediction score(most likely letter)
    predicted_class = np.argmax(predictions)

    # DEBUG: Check if predicted_class is within valid range
    print("Predicted label:", class_names[predicted_class])

    return jsonify(message="Prediction made", data={"predicted_class": (class_names[predicted_class])}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)