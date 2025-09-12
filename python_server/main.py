from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from io import BytesIO
# from base64 import b64decode
from urllib import request as urlRequest
import io, base64, numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing import image as tfImage

app = Flask(__name__)
CORS(app)

model = tf.keras.models.load_model("ASL.keras")

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
    img = Image.open('received_image.png')
    img_resized = img.resize((64, 64), Image.LANCZOS)
    img_resized = img_resized.convert('RGB')  # Ensure 3 channels
    img_resized.save('resized_image.png')

    # Preprocess image for model input
    img_array = tfImage.img_to_array(img_resized)                           # convert to numpy array
    img_array = img_array / 255.0                                 # normalize to [0,1]
    img_array = np.expand_dims(img_array, axis=0)  

    # Make model prediction and process output
    predictions = model.predict(img_array)
    # Mode output shape: (1, 29)
    predicted_class = np.argmax(predictions, axis=1)[0]
    class_names = [
    'A','B','C','D','E','F','G','H','I','J',
    'K','L','M','N','O','P','Q','R','S','T',
    'U','V','W','X','Y','Z','del','nothing','space'
    ]

    # Find the index of the highest prediction score(most likely letter)
    predicted_class = np.argmax(predictions)
    print("Predicted label:", class_names[predicted_class])
    
    return jsonify(message="Prediction made", data={"predicted_class": (class_names[predicted_class])}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)