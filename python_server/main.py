from flask import Flask, request, jsonify
from PIL import Image
import io, base64, numpy as np
import tensorflow as tf

app = Flask(__name__)

# TODO: load your model here
model = tf.keras.models.load_model("ASL.keras")

def preprocess(img: Image.Image):
    img = img.convert("RGB").resize((224, 224))
    arr = np.array(img).astype("float32") / 255.0
    arr = np.expand_dims(arr, axis=0)  # [1,224,224,3]
    return arr

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True)
    b64 = data.get("image_base64")
    if not b64:
        return jsonify(error="image_base64 required"), 400

    img_bytes = base64.b64decode(b64)
    img = Image.open(io.BytesIO(img_bytes))

    x = preprocess(img)
    # probs = model.predict(x)[0].tolist()
    # pred_idx = int(np.argmax(probs))
    pred_idx, probs = 0, [1.0]  # placeholder

    return jsonify(prediction=f"class_{pred_idx}", probs=probs)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)