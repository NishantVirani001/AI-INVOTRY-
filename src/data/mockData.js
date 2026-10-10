// StockPilot Data Layer - Initialized clean (no dummy data)

export const mockUsers = [];
export const mockCategories = [];
export const mockSuppliers = [];
export const mockProducts = [];
export const mockCustomers = [];
export const mockSales = [];
export const mockPurchases = [];
export const mockNotifications = [];

export const dashboardStats = {
  totalProducts: 0,
  totalCategories: 0,
  totalSuppliers: 0,
  totalSales: 0,
  revenue: 0,
  lowStock: 0,
  outOfStock: 0,
};

export const salesTrend = [];
export const inventoryLevels = [];
export const categoryDistribution = [];
export const recentActivity = [];

export const aiInsights = {
  predictedLowStock: [
    {
      sku: "RAW-3",
      product: "Copper Piping 2m",
      currentStock: 10,
      dailyVelocity: 1.5,
      daysUntilStockout: 4,
      confidence: 0.94,
    },
    {
      sku: "PWR-1",
      product: "Power Drill X",
      currentStock: 30,
      dailyVelocity: 2.1,
      daysUntilStockout: 9,
      confidence: 0.89,
    },
  ],
  reorderRecommendations: [
    {
      sku: "RAW-3",
      product: "Copper Piping 2m",
      supplier: "Parameport Global",
      suggestedQty: 25,
      urgency: "Critical",
      leadTimeDays: 4,
      reason: "Stock (10) is below safe ROP threshold (15). Lead time is 4d.",
    },
    {
      sku: "PWR-1",
      product: "Power Drill X",
      supplier: "Parameport Global",
      suggestedQty: 40,
      urgency: "Moderate",
      leadTimeDays: 3,
      reason: "Steady sales velocity requires pre-emptive replenishment buffer.",
    },
  ],
  fastMoving: ["Power Drill X", "Steel Hex Bolts"],
  slowMoving: ["Copper Piping 2m", "Industrial PVC Elbow"],
  anomalies: [],
};

export const aiChatCannedResponses = [];
