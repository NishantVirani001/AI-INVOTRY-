from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
import backend.models.core as models

def calculate_inventory_forecasts(db: Session) -> Dict[str, Any]:
    products = db.query(models.Product).all()
    orders = db.query(models.Order).all()
    order_items = db.query(models.OrderItem).all()
    transactions = db.query(models.InventoryTransaction).all()

    # Map product sold counts
    sold_by_product = {}
    for item in order_items:
        sold_by_product[item.product_id] = sold_by_product.get(item.product_id, 0) + item.quantity

    # Also check transactions
    for tx in transactions:
        if tx.type == "stock-out" and tx.quantity_change < 0:
            sold_by_product[tx.product_id] = sold_by_product.get(tx.product_id, 0) + abs(tx.quantity_change)

    predicted_low_stock = []
    reorder_recommendations = []
    fast_moving = []
    slow_moving = []
    anomalies = []

    # Historical lookback window (default 14 days)
    lookback_days = 14

    for p in products:
        total_sold = sold_by_product.get(p.id, 0)
        daily_velocity = max(0.2, round(total_sold / lookback_days, 2))

        # Supplier lead time (estimated from supplier rating, 3 to 6 days)
        lead_time = 4
        if p.supplier_obj and p.supplier_obj.rating:
            lead_time = max(2, int(7 - (p.supplier_obj.rating - 3.0) * 1.5))

        # Safety stock and reorder point
        safety_stock = p.safety_stock or max(5, int(p.reorder_level * 0.3))
        dynamic_rop = int((daily_velocity * lead_time) + safety_stock)

        # Days until stockout
        if p.quantity <= 0:
            days_left = 0
            confidence = 0.98
        else:
            days_left = max(1, int(p.quantity / daily_velocity))
            confidence = min(0.96, max(0.68, 0.72 + (0.04 * min(total_sold, 6))))

        # Categorize velocity
        if daily_velocity >= 0.7 or p.quantity < p.reorder_level:
            fast_moving.append(p.name)
        else:
            slow_moving.append(p.name)

        # Flag low stock predictions (either out of stock or projected under 10 days)
        if days_left <= 10 or p.quantity <= p.reorder_level:
            predicted_low_stock.append({
                "product": p.name,
                "sku": p.sku,
                "currentStock": p.quantity,
                "dailyVelocity": daily_velocity,
                "daysUntilStockout": days_left,
                "confidence": round(confidence, 2),
            })

        # Generate reorder recommendation if at or below reorder threshold
        if p.quantity <= max(p.reorder_level, dynamic_rop):
            # Target 30 days of inventory supply
            suggested_qty = max(15, int((daily_velocity * 30) - p.quantity))
            urgency = "Critical" if p.quantity <= 0 else "Moderate" if p.quantity <= safety_stock else "Routine"

            reorder_recommendations.append({
                "product": p.name,
                "sku": p.sku,
                "suggestedQty": suggested_qty,
                "urgency": urgency,
                "leadTimeDays": lead_time,
                "supplier": p.supplier_obj.name if p.supplier_obj else "Direct Vendor",
                "reason": (
                    f"Stock ({p.quantity}) is below ROP threshold ({dynamic_rop}). "
                    f"Lead time is {lead_time}d at velocity {daily_velocity:.1f} units/day."
                ),
            })

    # Calculate velocity statistics across all SKUs for Z-Score anomaly detection
    velocities = [max(0.2, round(sold_by_product.get(p.id, 0) / lookback_days, 2)) for p in products]
    if velocities:
        mean_v = sum(velocities) / len(velocities)
        variance_v = sum((v - mean_v) ** 2 for v in velocities) / max(1, len(velocities) - 1)
        std_v = variance_v ** 0.5 if variance_v > 0 else 0.5
    else:
        mean_v, std_v = 0.5, 0.3

    for p in products:
        total_sold = sold_by_product.get(p.id, 0)
        daily_velocity = max(0.2, round(total_sold / lookback_days, 2))
        z_score = round((daily_velocity - mean_v) / (std_v if std_v > 0.05 else 0.05), 2)

        # Statistical Anomaly Check:
        # Z-Score > 1.8 indicates statistical demand surge outlier (p < 0.05)
        if z_score >= 1.8:
            anomalies.append({
                "type": "SURGE_DEMAND",
                "severity": "high" if z_score >= 2.5 else "medium",
                "sku": p.sku,
                "product": p.name,
                "zScore": z_score,
                "message": f"Demand velocity of {daily_velocity:.1f}/day is a statistical outlier (z-score: +{z_score:.2f}, baseline mean: {mean_v:.2f}).",
            })
        elif p.quantity == 0 and total_sold > 0:
            anomalies.append({
                "type": "STOCKOUT_ANOMALY",
                "severity": "high",
                "sku": p.sku,
                "product": p.name,
                "zScore": round((0 - p.reorder_level) / max(1, p.safety_stock or 5), 2),
                "message": f"Zero available stock while product shows active demand ({total_sold} units sold in window).",
            })


    # Sort predicted low stock by days left ascending
    predicted_low_stock.sort(key=lambda x: x["daysUntilStockout"])

    return {
        "status": "active",
        "generatedAt": datetime.utcnow().isoformat(),
        "predictedLowStock": predicted_low_stock,
        "reorderRecommendations": reorder_recommendations,
        "fastMoving": fast_moving[:8],
        "slowMoving": slow_moving[:8],
        "anomalies": anomalies,
        "metrics": {
            "totalProductsAnalyzed": len(products),
            "stockoutRiskCount": len(predicted_low_stock),
            "recommendedReordersCount": len(reorder_recommendations),
            "activeAnomalies": len(anomalies),
        },
    }
