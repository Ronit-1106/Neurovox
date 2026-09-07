/**
 * Neurovox Production Inference Engine:
 * Employs ONNX Runtime Web as the sole production inference path for facial mask sizing.
 * Runs locally on the client device inside WebAssembly with zero server latency.
 * No heuristic fallbacks or simulated predictions.
 */
import { MaskSize } from './mask-fit';

export interface ModelInferenceResult {
  predictedSize: MaskSize;
  confidence: number;
  probabilities: {
    Small: number;
    Medium: number;
    Large: number;
  };
  inferenceLatencyMs: number;
  engine: 'onnxruntime-web';
}

const CLASSES: MaskSize[] = ['Small', 'Medium', 'Large'];

function softmax(arr: number[]): number[] {
  const maxVal = Math.max(...arr);
  const exps = arr.map((v) => Math.exp(v - maxVal));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / Math.max(sumExps, 1e-12));
}

let onnxSessionPromise: Promise<any> | null = null;
let cachedSession: any = null;

/**
 * Initializes and caches the ONNX Runtime Web InferenceSession.
 * Loads the validated ONNX model binary and configures WebAssembly backend.
 */
export async function getOrInitOnnxSession(): Promise<any> {
  if (cachedSession) {
    return cachedSession;
  }

  if (onnxSessionPromise) {
    return onnxSessionPromise;
  }

  onnxSessionPromise = (async () => {
    if (typeof window === 'undefined') {
      throw new Error('ONNX Runtime Web inference must be executed in a browser client environment.');
    }

    const ort = await import('onnxruntime-web');

    // Configure local WebAssembly binary paths
    if (ort.env && ort.env.wasm) {
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;
      ort.env.wasm.wasmPaths = '/';
    }

    const modelCandidates = [
      '/models/neurovox_mask_classifier.onnx',
      '/model/mask_classifier.onnx',
      '/neurovox_mask_classifier.onnx',
    ];

    let session: any = null;
    let lastError: Error | null = null;

    for (const modelUrl of modelCandidates) {
      try {
        session = await ort.InferenceSession.create(modelUrl, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
        if (session) {
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!session) {
      throw new Error(
        `Failed to load ONNX model binary for ONNX Runtime Web. Ensure the model has been exported: ${lastError?.message || 'Not found'}`
      );
    }

    cachedSession = session;
    return session;
  })();

  return onnxSessionPromise;
}

/**
 * Executes production inference via ONNX Runtime Web.
 * Sole inference path in production — takes the 16-element normalized feature vector
 * and returns predicted mask size, confidence, and genuine class probabilities.
 */
export async function runLocalModelInference(featureVector: number[]): Promise<ModelInferenceResult> {
  if (!Array.isArray(featureVector) || featureVector.length !== 16) {
    throw new Error(`Invalid feature vector for ONNX inference. Expected 16 elements, received ${featureVector?.length ?? 0}`);
  }

  const startTime = performance.now();
  const ort = await import('onnxruntime-web');
  const session = await getOrInitOnnxSession();

  const inputTensor = new ort.Tensor('float32', Float32Array.from(featureVector), [1, 16]);
  const inputName = session.inputNames[0] || 'input_features';
  const feeds: Record<string, any> = { [inputName]: inputTensor };

  const results = await session.run(feeds);

  // Read output probabilities or logits
  let probs: number[];
  if (results.probabilities) {
    const rawData = Array.from(results.probabilities.data as Float32Array);
    probs = rawData;
  } else if (results.logits) {
    const rawLogits = Array.from(results.logits.data as Float32Array);
    probs = softmax(rawLogits);
  } else {
    const firstOutputName = session.outputNames[0];
    const outputTensor = results[firstOutputName];
    const raw = Array.from(outputTensor.data as Float32Array);
    probs = raw.length === 3 && Math.abs(raw.reduce((a, b) => a + b, 0) - 1.0) < 0.05 ? raw : softmax(raw);
  }

  const bestIdx = probs.indexOf(Math.max(...probs));
  const endTime = performance.now();

  return {
    predictedSize: CLASSES[bestIdx],
    confidence: Math.round(probs[bestIdx] * 100) / 100,
    probabilities: {
      Small: Math.round(probs[0] * 1000) / 1000,
      Medium: Math.round(probs[1] * 1000) / 1000,
      Large: Math.round(probs[2] * 1000) / 1000,
    },
    inferenceLatencyMs: Math.round((endTime - startTime) * 10) / 10,
    engine: 'onnxruntime-web',
  };
}
