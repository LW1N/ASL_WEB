from flask import Flask, request, jsonify
from PIL import Image
import io, base64, numpy as np
import torch
import torch.nn.functional as F

app = Flask(__name__)

# TODO: load your model here
# model = MyModel(...)
# model.load_state_dict(torch.load("model.pt", map_location="cpu"))
# model.eval()

def preprocess(img: Image.Image):
    # resize/normalize to match your training pipeline
    img = img.convert("RGB").resize((224, 224))
    arr = np.array(img).astype("float32") / 255.0
    arr = (arr - 0.5) / 0.5  # example normalization
    arr = np.transpose(arr, (2, 0, 1))  # HWC->CHW
    tensor = torch.from_numpy(arr).unsqueeze(0)  # [1,3,224,224]
    return tensor

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True)
    b64 = data.get("image_base64")
    if not b64:
        return jsonify(error="image_base64 required"), 400

    img_bytes = base64.b64decode(b64)
    img = Image.open(io.BytesIO(img_bytes))

    x = preprocess(img)
    with torch.no_grad():
        # logits = model(x)
        # probs = F.softmax(logits, dim=1)[0].tolist()
        # pred_idx = int(torch.argmax(logits, dim=1))
        # Example placeholder while you wire your real model:
        pred_idx = 0
        probs = [1.0]

    return jsonify(prediction=f"class_{pred_idx}", probs=probs)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
