#!/usr/bin/env python3
"""
Neurovox ONNX Model Exporter
Converts the trained PyTorch / MLP model to ONNX format (neurovox_mask_classifier.onnx)
and stages it in both models/ and public/models/ for browser local inference via ONNX Runtime Web.
"""
import os
import sys
import json
import shutil

def export_model_to_onnx():
    models_dir = "models"
    public_models_dir = "public/models"
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(public_models_dir, exist_ok=True)

    onnx_target_path = os.path.join(models_dir, "neurovox_mask_classifier.onnx")
    public_onnx_path = os.path.join(public_models_dir, "neurovox_mask_classifier.onnx")
    weights_path = os.path.join(models_dir, "model_weights.json")
    public_weights_path = os.path.join(public_models_dir, "model_weights.json")

    try:
        import torch
        from ml.model import MaskSizeClassifier

        model = MaskSizeClassifier(input_dim=16, num_classes=3)
        pytorch_ckpt = os.path.join(models_dir, "mask_classifier_pytorch.pt")

        if os.path.exists(pytorch_ckpt):
            model.load_state_dict(torch.load(pytorch_ckpt, map_location="cpu"))
        elif os.path.exists(weights_path):
            with open(weights_path, "r") as f:
                w = json.load(f)
            state_dict = {k: torch.tensor(v, dtype=torch.float32) for k, v in w.items()}
            model.load_state_dict(state_dict)
        else:
            print("No checkpoint found. Training first...")
            from ml.train import main as train_main
            train_main()
            model.load_state_dict(torch.load(pytorch_ckpt, map_location="cpu"))

        model.eval()
        dummy_input = torch.randn(1, 16, dtype=torch.float32)

        torch.onnx.export(
            model,
            dummy_input,
            onnx_target_path,
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=["input_features"],
            output_names=["logits"],
            dynamic_axes={
                "input_features": {0: "batch_size"},
                "logits": {0: "batch_size"}
            }
        )
        print(f"Successfully exported PyTorch model to ONNX: {onnx_target_path}")

        # Copy to public directory for direct client-side browser fetching
        shutil.copyfile(onnx_target_path, public_onnx_path)
        print(f"Staged ONNX model in {public_onnx_path}")

    except Exception as e:
        print(f"PyTorch ONNX export note: {e}")
        # Build standard ONNX protobuf model using ONNX helper if torch is not ready
        try:
            import onnx
            from onnx import helper, TensorProto
            import numpy as np

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

            # Define ONNX computation graph
            in_node = helper.make_tensor_value_info("input_features", TensorProto.FLOAT, [None, 16])
            out_node = helper.make_tensor_value_info("logits", TensorProto.FLOAT, [None, 3])

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
            ]

            graph = helper.make_graph(
                nodes,
                "neurovox_mask_classifier",
                [in_node],
                [out_node],
                initializer=[w0_init, b0_init, w3_init, b3_init, w6_init, b6_init, w8_init, b8_init]
            )
            model_def = helper.make_model(graph, producer_name="neurovox-ml")
            onnx.save(model_def, onnx_target_path)
            shutil.copyfile(onnx_target_path, public_onnx_path)
            print(f"Exported ONNX graph via onnx.helper: {onnx_target_path}")
        except Exception as onnx_err:
            print(f"ONNX fallback export error: {onnx_err}")

    # Also ensure model_weights.json is staged in public/models
    if os.path.exists(weights_path):
        shutil.copyfile(weights_path, public_weights_path)
        print(f"Staged JSON weights in {public_weights_path}")

if __name__ == "__main__":
    export_model_to_onnx()
