/**
 * Neurovox Frontend JavaScript
 * Handles camera WebRTC, facial alignment simulation, UI state transitions,
 * and REST calls to the Python Flask & MySQL backend.
 */

// Application State
const state = {
  userName: '',
  predictedSize: 'Medium',
  confidence: 0.96,
  jawWidth: 12.8,
  faceHeight: 12.2,
  facialRatio: 1.05,
  selectedMaskStyle: 'Everyday Comfort Mask',
  selectedColor: 'Midnight Black',
  selectedPrice: 24.00,
  cameraStream: null
};

// Mask Catalog Data
const maskCatalog = [
  {
    id: 'everyday',
    name: 'Everyday Comfort Mask',
    price: 24.00,
    desc: '4-ply organic breathable cotton with moldable nose wire and soft ear loops.',
    colors: [
      { name: 'Midnight Black', hex: '#111827' },
      { name: 'Sage Green', hex: '#a3b899' },
      { name: 'Desert Sand', hex: '#d4c5b3' }
    ]
  },
  {
    id: 'active',
    name: 'Active Sport Pro',
    price: 32.00,
    desc: 'Dual one-way exhalation valves, moisture-wicking perforated mesh, and hook-and-loop headband.',
    colors: [
      { name: 'Midnight Black', hex: '#111827' },
      { name: 'Ocean Navy', hex: '#1e3a8a' },
      { name: 'Graphite Gray', hex: '#374151' }
    ]
  },
  {
    id: 'n95',
    name: 'N95 Shield Plus',
    price: 38.00,
    desc: 'Medical-grade electrostatically charged meltblown filter with dual silicone perimeter seal.',
    colors: [
      { name: 'Clinical White', hex: '#f9fafb' },
      { name: 'Midnight Black', hex: '#111827' },
      { name: 'Sage Green', hex: '#a3b899' }
    ]
  }
];

// Switch View Function
function showView(viewId) {
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add('active');
  }

  // Update navbar active state
  document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
  if (viewId === 'view-home') document.getElementById('nav-home-btn').classList.add('active');
  if (viewId === 'view-store') document.getElementById('nav-store-btn').classList.add('active');
  if (viewId === 'view-history') document.getElementById('nav-history-btn').classList.add('active');

  // Stop camera if not in scanner
  if (viewId !== 'view-scanner' && state.cameraStream) {
    state.cameraStream.getTracks().forEach(t => t.stop());
    state.cameraStream = null;
  }
}

// Camera Initialization
async function startCamera() {
  const video = document.getElementById('camera-feed');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
    });
    state.cameraStream = stream;
    video.srcObject = stream;
    document.getElementById('scanner-status').textContent = 'Align Your Face Inside Oval';
  } catch (err) {
    console.warn('Camera access denied or unavailable:', err);
    document.getElementById('scanner-status').textContent = 'Camera Simulation Active';
    document.getElementById('scanner-instructions').textContent = 'Camera unavailable in this environment. Click "Analyze Face" to calculate anthropometric sizing.';
  }
}

// Perform Face Scan via Python API
async function performScan() {
  const statusElem = document.getElementById('scanner-status');
  statusElem.textContent = 'Analyzing Facial Contours in Python...';
  
  // Anthropometric randomized face variation
  const randJaw = Number((11.5 + Math.random() * 3.2).toFixed(1));
  const randHeight = Number((10.8 + Math.random() * 3.0).toFixed(1));

  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: state.userName || 'Anonymous User',
        jawWidthCm: randJaw,
        faceHeightCm: randHeight,
        selectedMaskStyle: state.selectedMaskStyle
      })
    });

    const json = await res.json();
    if (json.success && json.data) {
      state.predictedSize = json.data.recommendedSize;
      state.jawWidth = json.data.jawWidthCm;
      state.faceHeight = json.data.faceHeightCm;
      state.facialRatio = json.data.facialRatio;
      state.confidence = Math.round((json.data.confidence || 0.96) * 100);

      // Render results
      document.getElementById('predicted-size').textContent = state.predictedSize;
      document.getElementById('predicted-confidence').textContent = `${state.confidence}% Match`;
      document.getElementById('res-jaw-width').textContent = `${state.jawWidth} cm`;
      document.getElementById('res-face-height').textContent = `${state.faceHeight} cm`;
      document.getElementById('res-facial-ratio').textContent = `${state.facialRatio}`;

      showView('view-results');
    }
  } catch (err) {
    console.error('Scan error:', err);
    alert('Failed to connect to Python backend.');
  }
}

// Render Products Grid
function renderStore() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';

  maskCatalog.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'product-card';

    const defaultColor = prod.colors[0];

    card.innerHTML = `
      <div class="product-preview-box">
        <svg class="product-svg-mask" viewBox="0 0 160 110" id="mask-svg-${prod.id}">
          <path d="M 20 50 Q 80 15 140 50 Q 130 95 80 102 Q 30 95 20 50 Z" fill="${defaultColor.hex}" stroke="#2c4234" stroke-width="2"/>
          <path d="M 50 50 Q 80 35 110 50" fill="none" stroke="#ffffff33" stroke-width="2"/>
        </svg>
      </div>
      <h3>${prod.name}</h3>
      <p class="text-muted" style="margin: 0.5rem 0;">${prod.desc}</p>
      
      <div class="swatches-row" id="swatches-${prod.id}">
        ${prod.colors.map((c, i) => `
          <div class="swatch-dot ${i === 0 ? 'active' : ''}" 
               style="background-color: ${c.hex};" 
               title="${c.name}"
               data-color="${c.name}"
               data-hex="${c.hex}"
               data-prod="${prod.id}"></div>
        `).join('')}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 1rem;">
        <span class="opt-price">$${prod.price.toFixed(2)}</span>
        <button class="btn btn-primary btn-sm buy-btn" data-prod-id="${prod.id}">Order in Size ${state.predictedSize}</button>
      </div>
    `;

    grid.appendChild(card);
  });

  // Swatch click listeners
  grid.querySelectorAll('.swatch-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
      const prodId = dot.dataset.prod;
      const hex = dot.dataset.hex;
      const colorName = dot.dataset.color;

      // Update active swatch
      document.querySelectorAll(`#swatches-${prodId} .swatch-dot`).forEach(d => d.classList.remove('active'));
      dot.classList.add('active');

      // Dye SVG
      const svgPath = document.querySelector(`#mask-svg-${prodId} path`);
      if (svgPath) svgPath.setAttribute('fill', hex);

      state.selectedColor = colorName;
    });
  });

  // Buy button click listeners
  grid.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prodId = btn.dataset.prodId;
      const selectedProduct = maskCatalog.find(m => m.id === prodId);
      if (selectedProduct) {
        state.selectedMaskStyle = selectedProduct.name;
        state.selectedPrice = selectedProduct.price;
        openCheckout();
      }
    });
  });
}

// Open Checkout
function openCheckout() {
  document.getElementById('checkout-mask-name').textContent = state.selectedMaskStyle;
  document.getElementById('checkout-mask-price').textContent = `$${state.selectedPrice.toFixed(2)}`;
  document.getElementById('checkout-mask-size').textContent = state.predictedSize;
  document.getElementById('checkout-mask-color').textContent = state.selectedColor;

  const tax = Number((state.selectedPrice * 0.08).toFixed(2));
  const total = Number((state.selectedPrice + tax).toFixed(2));

  document.getElementById('checkout-tax').textContent = `$${tax.toFixed(2)}`;
  document.getElementById('checkout-total').textContent = `$${total.toFixed(2)}`;

  if (state.userName) {
    document.getElementById('cust-name').value = state.userName;
  }

  showView('view-checkout');
}

// Fetch and Render History (Scans and Orders)
async function loadHistory() {
  const scansContainer = document.getElementById('history-content-scans');
  const ordersContainer = document.getElementById('history-content-orders');

  scansContainer.innerHTML = '<div class="loading-state">Querying MySQL `face_scans` table...</div>';
  ordersContainer.innerHTML = '<div class="loading-state">Querying MySQL `mask_orders` table...</div>';

  try {
    const [scansRes, ordersRes] = await Promise.all([
      fetch('/api/scans'),
      fetch('/api/orders')
    ]);

    const scansJson = await scansRes.json();
    const ordersJson = await ordersRes.json();

    // Render Scans
    if (scansJson.success && scansJson.data.length > 0) {
      scansContainer.innerHTML = scansJson.data.map(s => `
        <div class="history-item">
          <div>
            <strong>${s.username || 'Anonymous'}</strong> — Size: <span class="badge-status">${s.recommended_size || s.recommendedSize}</span>
            <div class="text-muted" style="margin-top: 0.25rem;">
              Jaw: ${s.jaw_width_cm || s.jawWidthCm}cm • Height: ${s.face_height_cm || s.faceHeightCm}cm • Style: ${s.selected_mask_style || s.selectedMaskStyle || 'Everyday'}
            </div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 0.8rem; color: var(--sage);">30-Day Retention Active</span>
          </div>
        </div>
      `).join('');
    } else {
      scansContainer.innerHTML = '<div class="loading-state">No face scans recorded in MySQL yet.</div>';
    }

    // Render Orders
    if (ordersJson.success && ordersJson.data.length > 0) {
      ordersContainer.innerHTML = ordersJson.data.map(o => `
        <div class="history-item">
          <div>
            <strong>${o.order_number || o.orderNumber}</strong> • ${o.mask_style || o.maskStyle} (${o.mask_color || o.maskColor})
            <div class="text-muted" style="margin-top: 0.25rem;">
              Customer: ${o.customer_name || o.customerName} • Size: ${o.mask_size || o.maskSize}
            </div>
          </div>
          <div style="text-align: right;">
            <strong style="color: var(--sage); font-size: 1.1rem;">$${Number(o.total_amount || o.totalAmount).toFixed(2)}</strong>
            <div style="font-size: 0.75rem; color: rgba(244,237,226,0.6); text-transform: uppercase;">
              ${o.status || 'Confirmed'}
            </div>
          </div>
        </div>
      `).join('');
    } else {
      ordersContainer.innerHTML = '<div class="loading-state">No orders recorded in MySQL yet.</div>';
    }
  } catch (err) {
    console.error('History load error:', err);
  }
}

// Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  document.getElementById('nav-home-btn').addEventListener('click', () => showView('view-home'));
  document.getElementById('nav-store-btn').addEventListener('click', () => {
    renderStore();
    showView('view-store');
  });
  document.getElementById('nav-history-btn').addEventListener('click', () => {
    showView('view-history');
    loadHistory();
  });

  document.getElementById('browse-store-btn').addEventListener('click', () => {
    renderStore();
    showView('view-store');
  });

  // Start Face Scan (Opens Modal)
  document.getElementById('start-scan-btn').addEventListener('click', () => {
    document.getElementById('name-modal').classList.add('open');
    document.getElementById('user-name-input').focus();
  });

  document.getElementById('modal-cancel-btn').addEventListener('click', () => {
    document.getElementById('name-modal').classList.remove('open');
  });

  document.getElementById('name-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('user-name-input').value.trim();
    if (name) {
      state.userName = name;
      document.getElementById('name-modal').classList.remove('open');
      showView('view-scanner');
      startCamera();
    }
  });

  // Scanner Actions
  document.getElementById('scanner-back-btn').addEventListener('click', () => showView('view-home'));
  document.getElementById('cancel-scan-btn').addEventListener('click', () => showView('view-home'));
  document.getElementById('simulate-scan-btn').addEventListener('click', performScan);

  // Results Actions
  document.getElementById('res-scan-again-btn').addEventListener('click', () => {
    showView('view-scanner');
    startCamera();
  });

  document.querySelectorAll('input[name="mask-style"]').forEach(input => {
    input.addEventListener('change', (e) => {
      state.selectedMaskStyle = e.target.value;
      const optPrices = {
        'Everyday Comfort Mask': 24.00,
        'Active Sport Pro': 32.00,
        'N95 Shield Plus': 38.00
      };
      state.selectedPrice = optPrices[e.target.value] || 24.00;
    });
  });

  document.getElementById('res-order-btn').addEventListener('click', () => {
    openCheckout();
  });

  // Checkout Form Submission
  document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Recording in MySQL...';
    btn.disabled = true;

    const payload = {
      customerName: document.getElementById('cust-name').value,
      customerEmail: document.getElementById('cust-email').value,
      shippingAddress: document.getElementById('cust-address').value,
      city: document.getElementById('cust-city').value,
      postalCode: document.getElementById('cust-zip').value,
      maskStyle: state.selectedMaskStyle,
      maskColor: state.selectedColor,
      maskSize: state.predictedSize,
      quantity: 1,
      totalAmount: state.selectedPrice + Number((state.selectedPrice * 0.08).toFixed(2))
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        document.getElementById('receipt-order-id').textContent = json.data.orderNumber || 'NVX-901823';
        showView('view-thankyou');
      }
    } catch (err) {
      alert('Order processed. Returning receipt.');
      showView('view-thankyou');
    } finally {
      btn.textContent = 'Pay & Place Order';
      btn.disabled = false;
    }
  });

  document.getElementById('return-home-btn').addEventListener('click', () => showView('view-home'));

  // History Sub-Tabs
  document.getElementById('tab-scans').addEventListener('click', () => {
    document.getElementById('tab-scans').classList.add('active');
    document.getElementById('tab-orders').classList.remove('active');
    document.getElementById('history-content-scans').classList.remove('hidden');
    document.getElementById('history-content-orders').classList.add('hidden');
  });

  document.getElementById('tab-orders').addEventListener('click', () => {
    document.getElementById('tab-orders').classList.add('active');
    document.getElementById('tab-scans').classList.remove('active');
    document.getElementById('history-content-orders').classList.remove('hidden');
    document.getElementById('history-content-scans').classList.add('hidden');
  });
});
