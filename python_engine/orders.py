#!/usr/bin/env python3
"""
Neurovox Order Processing Engine
Handles currency conversions, tax calculations, and fulfillment summaries in Indian Rupees (INR).
"""
import sys
import json
import uuid
from datetime import datetime

def process_order(order_payload):
    items = order_payload.get("items", [])
    shipping_address = order_payload.get("shippingAddress", {})
    customer_email = order_payload.get("customerEmail", "")

    subtotal_inr = 0
    for item in items:
        price = item.get("priceInr", 1499)
        qty = item.get("quantity", 1)
        subtotal_inr += price * qty

    # 18% GST standard protective equipment rate
    tax_inr = round(subtotal_inr * 0.18)
    # Free express delivery over ₹1,000
    shipping_inr = 0 if subtotal_inr >= 1000 else 150
    total_inr = subtotal_inr + tax_inr + shipping_inr

    order_id = f"NVX-IND-{str(uuid.uuid4())[:8].upper()}"

    return {
        "orderId": order_id,
        "status": "confirmed",
        "currency": "INR",
        "currencySymbol": "₹",
        "subtotalInr": subtotal_inr,
        "taxInr": tax_inr,
        "shippingInr": shipping_inr,
        "totalInr": total_inr,
        "formattedTotal": f"₹{total_inr:,}",
        "estimatedDeliveryDays": 3,
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }

if __name__ == "__main__":
    try:
        raw_args = sys.argv[1] if len(sys.argv) > 1 else "{}"
        payload = json.loads(raw_args)
        if isinstance(payload, list) and len(payload) > 0:
            payload = payload[0]
        result = process_order(payload)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)
