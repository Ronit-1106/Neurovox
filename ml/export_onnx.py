#!/usr/bin/env python3
"""
Neurovox ONNX Model Exporter:
Converts the trained MLP weights to ONNX format (opset 14) and stages the binary
in models/, public/models/, and public/model/ for production client-side execution via ONNX Runtime Web.
"""
import os
import json
import shutil
import numpy as np
import onnx
from onnx import helper, TensorProto

def export_model_to_onnx():
    weights_path = "models/model_weights.json"
    if not os.path.exists(weights_path):
        print(f"Weights file not found at {weights_path}. Running training pipeline...")
        from ml.train_and_export import train_and_export_pipeline
        train_and_export_pipeline()
        return

    with open(weights_path, "r") as f:
        w = json.load(f)

    w0 = np.array(w["network.0.weight"], dtype=np.float32)
    b0 = np.array(w["network.0.bias"], dtype=np.float32)
    w3 = np.array(w["network.3.weight"], dtype=np.float32)
    b3 = np.array(w["network.3.bias"], dtype=np.float32)
    w6 = np.array(w["network.6.weight"], dtype=np.float32)
    b6 = np.array(w["network.6.bias"], dtype=np.float32)
    w8 = np.array(w["network.8.weight"], dtype=np.float32)
    b8 = np.array(w["network.8.bias"], dtype=np.float32)

    in_node = helper.make_tensor_value_info("input_features", TensorProto.FLOAT, [None, 16])
    out_logits = helper.make_tensor_value_info("logits", TensorProto.FLOAT, [None, 3])
    out_probs = helper.make_tensor_value_info("probabilities", TensorProto.FLOAT, [None, 3])

    w0_init = helper.make_tensor("w0", TensorProto.FLOAT, w0.shape, w0.flatten().tolist())
    b0_init = helper.make_tensor("b0", TensorProto.FLOAT, b0.shape, b0.flatten().tolist())
    w3_init = helper.make_tensor("w3", TensorProto.FLOAT, w3.shape, w3.flatten().tolist())
    b3_init = helper.make_tensor("b3", TensorProto.FLOAT, b3.shape, b3.flatten().tolist())
    w6_init = helper.make_tensor("w6", TensorProto.FLOAT, w6.shape, w6.flatten().tolist())
    b6_init = helper.make_tensor("b6", TensorProto.FLOAT, b6.shape, b6.flatten().tolist())
    w8_init = helper.make_tensor("w8", TensorProto.FLOAT, w8.shape, w8.flatten().tolist())
    b8_init = helper.make_tensor("b8", TensorProto.FLOAT, b8.shape, b8.flatten().tolist())

    nodes = [
        helper.make_node("Gemm", ["input_features", "w0", "b0"], ["gemm0"], transB=1),
        helper.make_node("Relu", ["gemm0"], ["relu0"]),
        helper.make_node("Gemm", ["relu0", "w3", "b3"], ["gemm1"], transB=1),
        helper.make_node("Relu", ["gemm1"], ["relu1"]),
        helper.make_node("Gemm", ["relu1", "w6", "b6"], ["gemm2"], transB=1),
        helper.make_node("Relu", ["gemm2"], ["relu2"]),
        helper.make_node("Gemm", ["relu2", "w8", "b8"], ["logits"], transB=1),
        helper.make_node("Softmax", ["logits"], ["probabilities"], axis=1),
    ]

    graph = helper.make_graph(
        nodes,
        "neurovox_mask_classifier",
        [in_node],
        [out_logits, out_probs],
        initializer=[w0_init, b0_init, w3_init, b3_init, w6_init, b6_init, w8_init, b8_init]
    )

    model_def = helper.make_model(graph, producer_name="neurovox-ml", opset_imports=[helper.make_opsetid("", 14)])
    onnx.checker.check_model(model_def)

    destinations = [
        "models/neurovox_mask_classifier.onnx",
        "public/models/neurovox_mask_classifier.onnx",
        "public/model/mask_classifier.onnx",
        "public/neurovox_mask_classifier.onnx",
    ]

    for dest in destinations:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        onnx.save(model_def, dest)
        print(f"  ✓ Exported ONNX model to: {dest}")

if __name__ == "__main__":
    export_model_to_onnx()
